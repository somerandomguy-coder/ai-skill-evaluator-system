import { describe, expect, it } from "vitest";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ChallengeCallSchema } from "@/lib/ai/assemble-challenge";
import { bankSchemaFor } from "@/lib/ai/generate-requirements";
import {
  AssistantTurnSchema,
  CompanyResearchLlmSchema,
  EvaluatorOutputSchema,
  ParsedJdSchema,
} from "@/lib/ai/schemas";
import { detectBarriers, finalizeParsedJd } from "@/lib/ai/barriers";
import { supportsAdaptiveThinking } from "@/lib/ai/client";
import {
  LIMITS,
  PathError,
  applyWrites,
  buildTreeEntries,
  normalizePath,
  sanitizeWrites,
  toFileSystemTree,
} from "@/lib/files";
import { BASE_STARTER, BASE_VERSIONS, dependenciesChanged, guardPackageJson, mergeStarter } from "@/lib/starter";

describe("every model-facing schema can be sent as a structured-output format", () => {
  it.each([
    ["ParsedJd", ParsedJdSchema],
    ["CompanyResearchLlm", CompanyResearchLlmSchema],
    ["Challenge (with semantic rules)", ChallengeCallSchema],
    ["RequirementBank (with lints)", bankSchemaFor([])],
    ["AssistantTurn", AssistantTurnSchema],
    ["EvaluatorOutput", EvaluatorOutputSchema],
  ])("%s", (_name, schema) => {
    const fmt = betaZodOutputFormat(schema);
    expect(fmt.type).toBe("json_schema");
    expect(fmt.schema.type).toBe("object");
    expect(fmt.schema.additionalProperties).toBe(false);
  });
});

describe("model gating", () => {
  it("only sends thinking/effort to models that accept them", () => {
    for (const m of ["claude-opus-5", "claude-sonnet-5", "claude-opus-4-8", "claude-fable-5-1", "claude-sonnet-4-6"]) {
      expect(supportsAdaptiveThinking(m), m).toBe(true);
    }
    for (const m of ["claude-haiku-4-5", "claude-haiku-4-5-20251001", "claude-sonnet-4-5"]) {
      expect(supportsAdaptiveThinking(m), m).toBe(false);
    }
  });
});

describe("barrier detection", () => {
  const detect = (s: string) => detectBarriers(s).map((b) => b.kind);

  it.each([
    ["Local Australian experience is essential.", "LOCAL_EXPERIENCE"],
    ["Must be an Australian citizen or permanent resident.", "WORK_RIGHTS_OR_RESIDENCY"],
    ["Must have full working rights in Australia.", "WORK_RIGHTS_OR_RESIDENCY"],
    ["A Bachelor's degree in Computer Science is required.", "CREDENTIAL_GATE"],
    ["Graduate of a top-tier university.", "PEDIGREE_PROXY"],
    ["Strong culture fit with our team.", "CULTURE_FIT_PROXY"],
    ["Native English speaker only.", "NATIVE_LANGUAGE"],
    ["5+ years of professional experience in fintech.", "YEARS_OF_EXPERIENCE"],
  ])("flags: %s", (line, kind) => {
    expect(detect(line)).toEqual([kind]);
  });

  it("does not flag genuine, demonstrable requirements", () => {
    expect(detect("Build and operate REST APIs in TypeScript.\nWrite tests for the code you ship.\nDesign data pipelines in Python.")).toEqual([]);
  });

  it("keeps a barrier out of the skill lists even if the model put it there", () => {
    const parsed = finalizeParsedJd(
      {
        roleTitle: "Engineer",
        seniority: "MID",
        employer: "  ",
        location: null,
        domain: "fintech",
        teamContext: "",
        mustHaveSkills: ["TypeScript", "Local Australian experience is essential", "TypeScript"],
        niceToHaveSkills: ["Postgres", "TypeScript"],
        barriers: [],
      },
      "TypeScript\nLocal Australian experience is essential.\nPostgres"
    );
    expect(parsed.mustHaveSkills).toEqual(["TypeScript"]);
    expect(parsed.niceToHaveSkills).toEqual(["Postgres"]);
    expect(parsed.barriers.map((b) => b.kind)).toEqual(["LOCAL_EXPERIENCE"]);
    expect(parsed.employer).toBe("Unknown");
  });
});

describe("file paths", () => {
  it("normalises safe paths", () => {
    expect(normalizePath("./src//App.jsx")).toBe("src/App.jsx");
    expect(normalizePath("/src/a/../b.js")).toBe("src/b.js");
    expect(normalizePath("src\\lib\\gate.js")).toBe("src/lib/gate.js");
  });

  it.each(["", "   ", "../etc/passwd", "a/../../b", "node_modules/x/index.js", ".git/config", "C:\\Windows\\x", "a\0b", "/", "src/.next/x"])(
    "rejects unsafe path %j",
    (p) => {
      expect(() => normalizePath(p)).toThrow(PathError);
    }
  );

  it("sanitizeWrites reports bad entries instead of throwing, and lets the last duplicate win", () => {
    const { valid, rejected } = sanitizeWrites([
      { path: "src/a.js", contents: "one" },
      { path: "../evil.js", contents: "x" },
      { path: "src/a.js", contents: "two" },
      { path: "big.js", contents: "x".repeat(LIMITS.maxFileBytes + 1) },
    ]);
    expect(valid).toEqual([{ path: "src/a.js", contents: "two" }]);
    expect(rejected.map((r) => r.path).sort()).toEqual(["../evil.js", "big.js"]);
  });

  it("enforces the project-wide file cap", () => {
    const existing = Object.fromEntries(Array.from({ length: LIMITS.maxFiles }, (_, i) => [`f${i}.js`, "x"]));
    const { valid, rejected } = sanitizeWrites([{ path: "one-too-many.js", contents: "x" }, { path: "f0.js", contents: "y" }], existing);
    expect(valid.map((w) => w.path)).toEqual(["f0.js"]); // overwriting is fine
    expect(rejected[0].path).toBe("one-too-many.js");
  });

  it("builds the nested tree WebContainer mounts, and the sorted UI listing", () => {
    const files = { "package.json": "{}", "src/App.jsx": "a", "src/lib/gate.js": "g" };
    expect(toFileSystemTree(files)).toEqual({
      "package.json": { file: { contents: "{}" } },
      src: { directory: { "App.jsx": { file: { contents: "a" } }, lib: { directory: { "gate.js": { file: { contents: "g" } } } } } },
    });
    const entries = buildTreeEntries(Object.keys(files));
    expect(entries.map((e) => e.name)).toEqual(["src", "package.json"]); // directories first
    expect(entries[0].children!.map((e) => e.name)).toEqual(["lib", "App.jsx"]);
    expect(applyWrites({ a: "1" }, [{ path: "a", contents: "2" }, { path: "b", contents: "3" }])).toEqual({ a: "2", b: "3" });
  });
});

describe("starter template", () => {
  it("ships a lockfile that pins the wasm rollup override, so install is fast and works in the browser", () => {
    const lock = JSON.parse(BASE_STARTER["package-lock.json"]);
    expect(lock.packages["node_modules/rollup"].name).toBe("@rollup/wasm-node");
    expect(lock.packages["node_modules/vite"].version).toBe(BASE_VERSIONS.vite);
    expect(Object.keys(lock.packages).length).toBeLessThan(60); // minimal dependencies
    const pkg = JSON.parse(BASE_STARTER["package.json"]);
    expect(Object.keys(pkg.dependencies)).toEqual(["react", "react-dom"]);
    expect(Object.keys(pkg.devDependencies)).toEqual(["vite"]); // no babel-heavy @vitejs/plugin-react
  });

  it("a generated starter can never replace the files that keep the container bootable", () => {
    const merged = mergeStarter({ "package.json": "EVIL", "vite.config.js": "EVIL", "src/main.jsx": "EVIL", "src/data.json": "[]" });
    expect(merged["package.json"]).toBe(BASE_STARTER["package.json"]);
    expect(merged["vite.config.js"]).toBe(BASE_STARTER["vite.config.js"]);
    expect(merged["src/main.jsx"]).toBe(BASE_STARTER["src/main.jsx"]);
    expect(merged["src/data.json"]).toBe("[]");
  });

  describe("guardPackageJson", () => {
    const prev = BASE_STARTER["package.json"];

    it("lets the assistant add a dependency", () => {
      const next = JSON.parse(prev);
      next.dependencies["date-fns"] = "^3.0.0";
      const g = guardPackageJson(JSON.stringify(next), prev);
      expect(g.accepted).toBe(true);
      expect(g.notes).toEqual([]);
      expect(JSON.parse(g.contents).dependencies["date-fns"]).toBe("^3.0.0");
    });

    it("restores pinned versions, the dev script and the rollup override if they were dropped", () => {
      const g = guardPackageJson(
        JSON.stringify({ name: "x", scripts: { dev: "vite --host" }, dependencies: { react: "19.0.0" }, devDependencies: { vite: "^7" } }),
        prev
      );
      const pkg = JSON.parse(g.contents);
      expect(pkg.dependencies).toMatchObject({ react: BASE_VERSIONS.react, "react-dom": BASE_VERSIONS["react-dom"] });
      expect(pkg.devDependencies.vite).toBe(BASE_VERSIONS.vite);
      expect(pkg.scripts.dev).toBe("vite");
      expect(pkg.overrides.rollup).toBe("npm:@rollup/wasm-node");
      expect(pkg.type).toBe("module");
      expect(g.notes.length).toBeGreaterThanOrEqual(4);
    });

    it("keeps the previous file when the new one is not valid JSON", () => {
      const g = guardPackageJson("{ not json", prev);
      expect(g).toMatchObject({ accepted: false, contents: prev });
    });

    it("detects dependency-relevant changes only", () => {
      const withScript = JSON.parse(prev);
      withScript.scripts.lint = "eslint .";
      expect(dependenciesChanged(prev, JSON.stringify(withScript))).toBe(false);
      withScript.dependencies.zod = "^4";
      expect(dependenciesChanged(prev, JSON.stringify(withScript))).toBe(true);
      expect(dependenciesChanged(prev, prev)).toBe(false);
      expect(dependenciesChanged(prev, "not json")).toBe(true);
    });
  });
});
