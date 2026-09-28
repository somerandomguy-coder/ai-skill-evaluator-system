import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildProjectZip, downloadProjectZip } from "@/lib/export/zip";

describe("buildProjectZip", () => {
  it("generates a valid zip from FileMap Record<string, string>", async () => {
    const files = {
      "src/index.ts": "console.log('hello');",
      "package.json": JSON.stringify({ name: "test-app" }),
    };

    const zip = await buildProjectZip(files);
    const indexFile = zip.file("src/index.ts");
    expect(indexFile).toBeDefined();
    expect(await indexFile?.async("string")).toBe("console.log('hello');");

    const pkgFile = zip.file("package.json");
    expect(pkgFile).toBeDefined();
  });

  it("generates a valid zip from FileWrite array with contents", async () => {
    const fileList = [
      { path: "README.md", contents: "# Project Readme" },
      { path: "src/app.tsx", contents: "export default function App() {}" },
    ];

    const zip = await buildProjectZip(fileList);
    const readme = zip.file("README.md");
    expect(readme).toBeDefined();
    expect(await readme?.async("string")).toBe("# Project Readme");

    const app = zip.file("src/app.tsx");
    expect(app).toBeDefined();
    expect(await app?.async("string")).toBe("export default function App() {}");
  });

  it("creates a downloadable blob safely without document in Node", async () => {
    const files = {
      "main.py": "print('hello')",
    };
    const blob = await downloadProjectZip(files, "python-project");
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);
  });
});
