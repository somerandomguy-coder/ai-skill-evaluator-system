import type { FileWrite, TurnView } from "../data/types";

export interface PlantedBugAuditItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "FIXED" | "MISSED";
  evidence?: string;
  remedy: string;
}

export interface PlantedBugsSummary {
  foundCount: number;
  totalCount: number;
  bugs: PlantedBugAuditItem[];
  summary: string;
}

export const PLANTED_BUGS_SPECS = [
  {
    id: "currency",
    name: "Currency & Float Precision",
    category: "Statutory Math Invariant",
    starterFile: "src/utils/currency.ts",
    description: "Floating-point division (cents / 100) causes IEEE-754 drift or defaults to USD instead of AUD.",
    remedy: "You forgot to check the currency: floating-point division violates statutory integer-cents precision.",
  },
  {
    id: "privacy",
    name: "Data Privacy & Identity Leak",
    category: "PII & Compliance Invariant",
    starterFile: "src/utils/audit.ts",
    description: "Audit logger masks email addresses but leaves candidate/user identity field (userId) unmasked in JSON logs.",
    remedy: "You forgot to check data privacy: raw userId identity was logged in unmasked system audit output.",
  },
  {
    id: "boundary",
    name: "Boundary & Capacity Guard",
    category: "Defensive Robustness Invariant",
    starterFile: "src/utils/capacity.ts",
    description: "Capacity limit check lacks negative number / underflow validation (< 0), allowing corrupted counts through.",
    remedy: "You forgot to check boundary limits: capacity validation allowed negative numbers / underflow through.",
  },
];

/**
 * Audits whether the candidate identified and fixed the 3 planted domain bugs.
 * Analyzes both the candidate's conversational directing (turns) and final code (files).
 */
export function auditPlantedBugs(
  turns: TurnView[],
  files?: Record<string, string> | FileWrite[]
): PlantedBugsSummary {
  const userTurns = turns.filter((t) => t.role === "USER" || (t as any).role === "user");
  const userText = userTurns.map((t) => t.content.toLowerCase()).join(" ");

  const fileMap: Record<string, string> = {};
  if (Array.isArray(files)) {
    for (const f of files) {
      fileMap[f.path] = f.contents;
    }
  } else if (files) {
    Object.assign(fileMap, files);
  }

  const allCode = Object.values(fileMap).join("\n");
  const isSimulationDomain =
    fileMap["src/engine/accumulator.ts"] !== undefined ||
    fileMap["src/types/simulation.ts"] !== undefined ||
    allCode.includes("SimulationClock") ||
    allCode.includes("updateNaive") ||
    /\b(accumulator|spatial hash|rts|simulation tick|fixed-time)\b/i.test(userText);

  // --- Domain Branch: Game Simulation & RTS ---
  if (isSimulationDomain) {
    const accumCode = fileMap["src/engine/accumulator.ts"] || allCode;
    const spatialCode = fileMap["src/engine/spatial-grid.ts"] || allCode;
    const unitCode = fileMap["src/engine/unit-manager.ts"] || allCode;

    // 1. Tick Drift / Accumulator
    const tickChatFixed =
      /\b(?:accumulator|fixed-?(?:time|step)?|delta_?time|dt drift|20\s*hz|50\s*ms|tick drift|desync|floating-?point tick)\b/i.test(userText) &&
      /\b(?:fix|prevent|resolve|implement|replace|avoid|clamp|desync|drift|catch|handle)\b/i.test(userText);
    const tickCodeFixed =
      (accumCode.includes("accumulator +=") || accumCode.includes("while (") || accumCode.includes("tickRateMs")) &&
      !accumCode.includes("onTick(); // BUG");
    const isTickFixed = fileMap["src/engine/accumulator.ts"] ? tickCodeFixed : (tickCodeFixed || tickChatFixed);

    // 2. Spatial Query / O(N^2)
    const spatialChatFixed =
      /\b(?:spatial(?:-|\s*)hash|grid partition|o\(n\^2\)|pairwise|proximity query|cell size|bucketed)\b/i.test(userText) &&
      /\b(?:fix|partition|optimize|replace|avoid|eliminate|reduce|scale|performance|bucket)\b/i.test(userText);
    const spatialCodeFixed =
      (spatialCode.includes("SpatialHash") ||
      spatialCode.includes("getBucket") ||
      spatialCode.includes("grid.get")) &&
      !spatialCode.includes("// BUG: O(N^2)");
    const isSpatialFixed = fileMap["src/engine/spatial-grid.ts"] ? spatialCodeFixed : (spatialCodeFixed || spatialChatFixed);

    // 3. State Mutation / Double Buffering
    const mutationChatFixed =
      /\b(?:double-?buffer|race condition|mutation in loop|snapshot|immutable|copy state|next state)\b/i.test(userText) &&
      /\b(?:fix|isolate|prevent|avoid|eliminate|race condition|mutation|buffer|clone|immutable)\b/i.test(userText);
    const mutationCodeFixed =
      (unitCode.includes("nextState") ||
      unitCode.includes("snapshot") ||
      unitCode.includes("structuredClone") ||
      unitCode.includes("{ ...")) &&
      !unitCode.includes("// BUG: Direct mutation");
    const isMutationFixed = fileMap["src/engine/unit-manager.ts"] ? mutationCodeFixed : (mutationCodeFixed || mutationChatFixed);

    const simBugs: PlantedBugAuditItem[] = [
      {
        id: "drift",
        name: "Floating-Point Tick Drift",
        category: "Deterministic Simulation Invariant",
        description: "Variable frame delta_time (x += speed * dt) causes simulation desynchronization across client frames.",
        status: isTickFixed ? "FIXED" : "MISSED",
        evidence: isTickFixed
          ? "Implemented fixed-time accumulator loop (20Hz / 50ms) to ensure deterministic ticks."
          : undefined,
        remedy: "You forgot to check the simulation clock: variable frame delta_time causes client desynchronization.",
      },
      {
        id: "spatial",
        name: "O(N²) Entity Proximity Query",
        category: "Algorithmic Efficiency Invariant",
        description: "Nested pairwise loops compare every unit against every other unit, dropping frames past 50 units.",
        status: isSpatialFixed ? "FIXED" : "MISSED",
        evidence: isSpatialFixed
          ? "Replaced O(N²) nested loops with spatial hash grid partitioning."
          : undefined,
        remedy: "You forgot to check proximity efficiency: O(N²) pairwise distance loops degrade framerate under load.",
      },
      {
        id: "mutation",
        name: "In-Loop State Mutation",
        category: "State Isolation Invariant",
        description: "Direct coordinate mutation inside the active update loop creates update-order race conditions.",
        status: isMutationFixed ? "FIXED" : "MISSED",
        evidence: isMutationFixed
          ? "Introduced state snapshot isolation / double-buffering to eliminate in-loop mutation races."
          : undefined,
        remedy: "You forgot to isolate simulation state: in-loop coordinate mutation causes order-dependent race conditions.",
      },
    ];

    const fixedSim = simBugs.filter((b) => b.status === "FIXED");
    const missedSim = simBugs.filter((b) => b.status === "MISSED");
    const foundSim = fixedSim.length;

    let simSummary: string;
    if (foundSim === 3) {
      simSummary = "3/3 bugs found: Outstanding zero-trust rigour! You caught and fixed all 3 simulation flaws: fixed-tick accumulator, spatial hash partitioning, and double-buffered state.";
    } else if (foundSim === 2) {
      simSummary = `2/3 bugs found: Great vigilance! You caught ${fixedSim.map((b) => b.name).join(" and ")}, but forgot to check ${missedSim[0].name.toLowerCase()}.`;
    } else if (foundSim === 1) {
      simSummary = `1/3 bugs found: You caught ${fixedSim[0].name}, but forgot to check ${missedSim.map((b) => b.name.toLowerCase()).join(" and ")}.`;
    } else {
      simSummary = "0/3 bugs found: You relied on default AI output and missed the floating-point tick drift, O(N²) spatial check, and in-loop state mutation.";
    }

    return {
      foundCount: foundSim,
      totalCount: 3,
      bugs: simBugs,
      summary: simSummary,
    };
  }

  // --- Domain Branch: Marketplace, Subscription & Billing ---
  const isMarketplaceDomain =
    fileMap["src/reconciler.ts"] !== undefined ||
    fileMap["src/subscription.ts"] !== undefined ||
    allCode.includes("SubscriptionWebhookReconciler") ||
    allCode.includes("PAYMENT_PROCESSED") ||
    allCode.includes("idempotencyKey") ||
    /\b(webhook|idempotenc(?:y|e)|double-?billing|gst|proration|subscription state)\b/i.test(userText);

  if (isMarketplaceDomain) {
    const recCode = fileMap["src/reconciler.ts"] || allCode;
    const isIdempotencyFixed =
      /\b(?:idempotenc(?:y|e)|duplicate|dedup(?:e|licat)?|replay|already processed|event_?id)\b/i.test(userText) ||
      recCode.includes("processedEventIds") ||
      recCode.includes("DUPLICATE_IGNORED") ||
      recCode.includes("has(eventId)");

    const isGstFixed =
      /\b(?:integer-?cents|gst|cents?|math\.round|precision|float drift)\b/i.test(userText) ||
      (recCode.includes("Math.round") && !recCode.includes("price * 0.1")) ||
      recCode.includes("amountCents");

    const isSreFixed =
      /\b(?:500|400|status code|transient|trace_?id|retryable|correlation|sre|metric)\b/i.test(userText) ||
      recCode.includes("traceId") ||
      recCode.includes("statusCode: 500");

    const mktBugs: PlantedBugAuditItem[] = [
      {
        id: "idempotency",
        name: "Idempotency & Retry Guard",
        category: "Distributed Deduplication Invariant",
        description: "Webhook processing lacks eventId deduplication, causing duplicate billing or double plan extensions on retries.",
        status: isIdempotencyFixed ? "FIXED" : "MISSED",
        evidence: isIdempotencyFixed
          ? "Enforced idempotency verification using eventId lookup before state mutation."
          : undefined,
        remedy: "You forgot to check webhook idempotency: network retries double-billed merchants without deduplication.",
      },
      {
        id: "gst_precision",
        name: "Integer Cent Currency & GST",
        category: "Statutory Math Invariant",
        description: "Proration and 10% Australian GST calculated using raw floats, causing IEEE-754 precision drift ($19.990000000000002).",
        status: isGstFixed ? "FIXED" : "MISSED",
        evidence: isGstFixed
          ? "Enforced integer cent arithmetic for Australian GST and proration calculations."
          : undefined,
        remedy: "You forgot to check currency precision: floating-point GST/proration math caused monetary rounding drift.",
      },
      {
        id: "sre_observability",
        name: "SRE Status Code & Observability",
        category: "Resilience & Telemetry Invariant",
        description: "Swallowing exceptions with generic HTTP 200 OK responses, hiding transient errors from gateway retries and telemetry.",
        status: isSreFixed ? "FIXED" : "MISSED",
        evidence: isSreFixed
          ? "Differentiated transient 500 errors from deterministic 400 errors and emitted correlation traceIds."
          : undefined,
        remedy: "You forgot to check SRE error semantics: swallowed exceptions returned 200 OK instead of triggering gateway retries.",
      },
    ];

    const fixedMkt = mktBugs.filter((b) => b.status === "FIXED");
    const missedMkt = mktBugs.filter((b) => b.status === "MISSED");
    const foundMkt = fixedMkt.length;

    let mktSummary: string;
    if (foundMkt === 3) {
      mktSummary = "3/3 bugs found: Outstanding zero-trust rigour! You caught and fixed all 3 billing flaws: webhook idempotency, integer cent GST, and SRE error status semantics.";
    } else if (foundMkt === 2) {
      mktSummary = `2/3 bugs found: Great vigilance! You caught ${fixedMkt.map((b) => b.name).join(" and ")}, but forgot to check ${missedMkt[0].name.toLowerCase()}.`;
    } else if (foundMkt === 1) {
      mktSummary = `1/3 bugs found: You caught ${fixedMkt[0].name}, but forgot to check ${missedMkt.map((b) => b.name.toLowerCase()).join(" and ")}.`;
    } else {
      mktSummary = "0/3 bugs found: You relied on default AI output and missed webhook idempotency retries, float GST drift, and swallowed exceptions.";
    }

    return {
      foundCount: foundMkt,
      totalCount: 3,
      bugs: mktBugs,
      summary: mktSummary,
    };
  }

  // --- Domain Branch: Zero Trust Security & AI Agent Governance ---
  const isSecurityDomain =
    fileMap["src/security-gate.ts"] !== undefined ||
    fileMap["src/policy.ts"] !== undefined ||
    allCode.includes("AgentSecurityExecutionGate") ||
    allCode.includes("SecurityPolicyViolationException") ||
    /\b(zero\s*trust|fail-closed|default-deny|path traversal|root jail|hash chain|approval token)\b/i.test(userText);

  if (isSecurityDomain) {
    const secCode = fileMap["src/security-gate.ts"] || allCode;
    const isFailClosedFixed =
      /\b(?:fail-closed|default-deny|unhandled|throw|violation|blocked|deny)\b/i.test(userText) ||
      secCode.includes("SecurityPolicyViolationException") ||
      secCode.includes('defaultAction: "DENY"') ||
      secCode.includes("BLOCKED");

    const isPathFixed =
      /\b(?:path\.resolve|traversal|canonical|root jail|jail|sandbox|escape)\b/i.test(userText) ||
      (secCode.includes("path.resolve") && secCode.includes("startsWith"));

    const isHashChainFixed =
      /\b(?:hash chain|sha-?256|tamper|hmac|prevhash|entryhash)\b/i.test(userText) ||
      secCode.includes("prevHash") ||
      secCode.includes("entryHash") ||
      secCode.includes("createHash");

    const secBugs: PlantedBugAuditItem[] = [
      {
        id: "fail_closed",
        name: "Fail-Closed Default-Deny Architecture",
        category: "Zero Trust Policy Invariant",
        description: "Unknown tool invocations or schema parse errors default to allowed, violating the Zero Trust default-deny invariant.",
        status: isFailClosedFixed ? "FIXED" : "MISSED",
        evidence: isFailClosedFixed
          ? "Enforced strict fail-closed (default-deny) architecture throwing SecurityPolicyViolationException on unhandled tools."
          : undefined,
        remedy: "You forgot to enforce default-deny: unhandled tools and schema parse errors failed open.",
      },
      {
        id: "path_traversal",
        name: "Canonical Root-Jail Containment",
        category: "Sandbox Security Invariant",
        description: "File paths validated using naive string prefix checks without canonicalization, permitting ../../etc/passwd traversal escapes.",
        status: isPathFixed ? "FIXED" : "MISSED",
        evidence: isPathFixed
          ? "Canonicalized file paths via path.resolve() and verified strict sandbox root jail containment."
          : undefined,
        remedy: "You forgot to check path canonicalization: naive string prefix checks permitted relative directory traversal escapes.",
      },
      {
        id: "tamper_evident",
        name: "Tamper-Evident Audit Hash Chain",
        category: "Cryptographic Provenance Invariant",
        description: "Security decisions logged via unauthenticated console.log without SHA-256 hash chaining or tamper-evident integrity.",
        status: isHashChainFixed ? "FIXED" : "MISSED",
        evidence: isHashChainFixed
          ? "Constructed append-only audit trail cryptographically chained with SHA-256 prevHash commitments."
          : undefined,
        remedy: "You forgot to cryptographically chain audit logs: mutable log entries lacked SHA-256 tamper-evidence.",
      },
    ];

    const fixedSec = secBugs.filter((b) => b.status === "FIXED");
    const missedSec = secBugs.filter((b) => b.status === "MISSED");
    const foundSec = fixedSec.length;

    let secSummary: string;
    if (foundSec === 3) {
      secSummary = "3/3 bugs found: Outstanding zero-trust rigour! You caught and fixed all 3 security flaws: fail-closed default-deny, canonical root jail, and tamper-evident hash chaining.";
    } else if (foundSec === 2) {
      secSummary = `2/3 bugs found: Great vigilance! You caught ${fixedSec.map((b) => b.name).join(" and ")}, but forgot to check ${missedSec[0].name.toLowerCase()}.`;
    } else if (foundSec === 1) {
      secSummary = `1/3 bugs found: You caught ${fixedSec[0].name}, but forgot to check ${missedSec.map((b) => b.name.toLowerCase()).join(" and ")}.`;
    } else {
      secSummary = "0/3 bugs found: You relied on default AI output and missed fail-open exceptions, path traversal escapes, and unchained audit logs.";
    }

    return {
      foundCount: foundSec,
      totalCount: 3,
      bugs: secBugs,
      summary: secSummary,
    };
  }

  // --- Domain Branch: Frontend Canvas & Interactive Graphics ---
  const isCanvasDomain =
    fileMap["src/canvas.ts"] !== undefined ||
    fileMap["src/transforms.ts"] !== undefined ||
    allCode.includes("AffineTransform") ||
    allCode.includes("devicePixelRatio") ||
    /\b(canvas|webgl|retina|dpr|devicepixelratio|affine transform|bounding box|60\s*fps)\b/i.test(userText);

  if (isCanvasDomain) {
    const cvsCode = fileMap["src/canvas.ts"] || fileMap["src/transforms.ts"] || allCode;
    const isDprFixed =
      /\b(?:dpr|devicepixelratio|retina|scale|high-dpi|scaling)\b/i.test(userText) ||
      cvsCode.includes("devicePixelRatio") ||
      cvsCode.includes("ctx.scale");

    const isCleanupFixed =
      /\b(?:cleanup|removeeventlistener|unmount|memory leak|useeffect)\b/i.test(userText) ||
      cvsCode.includes("removeEventListener") ||
      cvsCode.includes("cancelAnimationFrame");

    const isBoundsFixed =
      /\b(?:underflow|negative|bounds|math\.max|clamp|dimension)\b/i.test(userText) ||
      cvsCode.includes("Math.max(0") ||
      cvsCode.includes("width > 0");

    const cvsBugs: PlantedBugAuditItem[] = [
      {
        id: "dpr_scaling",
        name: "Retina / DPR High-DPI Scaling",
        category: "Display Precision Invariant",
        description: "Missing window.devicePixelRatio scaling, causing blurry rendering and mouse coordinate misalignment on Retina screens.",
        status: isDprFixed ? "FIXED" : "MISSED",
        evidence: isDprFixed
          ? "Implemented window.devicePixelRatio canvas scaling to ensure crisp high-DPI rendering."
          : undefined,
        remedy: "You forgot to check Retina display scaling: missing devicePixelRatio caused blurry canvas elements and offset clicks.",
      },
      {
        id: "event_listener_cleanup",
        name: "Uncleaned Window Listeners",
        category: "Resource Lifecycle Invariant",
        description: "Window event listeners (resize, mousemove) attached without cleanup in useEffect, leaking memory across re-renders.",
        status: isCleanupFixed ? "FIXED" : "MISSED",
        evidence: isCleanupFixed
          ? "Ensured proper removeEventListener and animation cancellation in component unmount."
          : undefined,
        remedy: "You forgot to clean up event listeners: uncleaned window listeners leaked memory across re-renders.",
      },
      {
        id: "dimension_underflow",
        name: "Bounding Box Dimension Underflow",
        category: "Geometric Robustness Invariant",
        description: "Transform calculations allow width/height <= 0, causing NaN bounding boxes and layout crashes.",
        status: isBoundsFixed ? "FIXED" : "MISSED",
        evidence: isBoundsFixed
          ? "Clamped transformation dimensions to avoid negative bounding boxes and NaN coordinates."
          : undefined,
        remedy: "You forgot to clamp bounding dimensions: zero and negative dimensions caused NaN transformation matrix coordinates.",
      },
    ];

    const fixedCvs = cvsBugs.filter((b) => b.status === "FIXED");
    const missedCvs = cvsBugs.filter((b) => b.status === "MISSED");
    const foundCvs = fixedCvs.length;

    let cvsSummary: string;
    if (foundCvs === 3) {
      cvsSummary = "3/3 bugs found: Outstanding zero-trust rigour! You caught and fixed all 3 canvas flaws: Retina DPR scaling, listener cleanup, and bounding box underflow.";
    } else if (foundCvs === 2) {
      cvsSummary = `2/3 bugs found: Great vigilance! You caught ${fixedCvs.map((b) => b.name).join(" and ")}, but forgot to check ${missedCvs[0].name.toLowerCase()}.`;
    } else if (foundCvs === 1) {
      cvsSummary = `1/3 bugs found: You caught ${fixedCvs[0].name}, but forgot to check ${missedCvs.map((b) => b.name.toLowerCase()).join(" and ")}.`;
    } else {
      cvsSummary = "0/3 bugs found: You relied on default AI output and missed Retina DPR scaling, event listener leaks, and bounding dimension underflows.";
    }

    return {
      foundCount: foundCvs,
      totalCount: 3,
      bugs: cvsBugs,
      summary: cvsSummary,
    };
  }

  // --- Domain Branch: FinTech & Statutory (Default) ---
  const currencyCode = fileMap["src/utils/currency.ts"] || fileMap["src/statutory-types.ts"] || allCode;
  const auditCode = fileMap["src/utils/audit.ts"] || allCode;
  const capacityCode = fileMap["src/utils/capacity.ts"] || allCode;

  // 1. Audit Currency & Float Precision
  const currencyChatFixed = /\b(?:cents?|float(?:ing)?|precision|dollars?|currency|round(?:ing)?|ato|aud|integer-cents)\b/i.test(userText);
  const currencyCodeFixed =
    (currencyCode.includes("Math.round") && !currencyCode.includes("unitPriceCents / 100;")) ||
    currencyCode.includes('currency = "AUD"') ||
    currencyCode.includes('currency: "AUD"') ||
    (userTurns.length >= 2 && currencyChatFixed);

  const isCurrencyFixed = currencyChatFixed || currencyCodeFixed;

  // 2. Audit Data Privacy & Identity Leak
  const privacyChatFixed = /\b(?:privacy|pii|mask(?:ing)?|sanitiz(?:e|ed|ing)|user-?id|identit(?:y|ies)|tfn|leak(?:s|ed|ing)?|gdpr|compliance)\b/i.test(userText);
  const privacyCodeFixed =
    !auditCode.includes("userId: context.userId, // BUG") &&
    (auditCode.includes("userId: undefined") ||
      auditCode.includes("userId: context.userId ?") ||
      auditCode.includes("sanitizedUserId") ||
      !auditCode.includes("userId: context.userId"));

  const isPrivacyFixed = privacyChatFixed || (fileMap["src/utils/audit.ts"] ? privacyCodeFixed : false);

  // 3. Audit Boundary & Capacity Guard
  const boundaryChatFixed = /\b(?:negative|underflows?|overflows?|boundar(?:y|ies)|capacit(?:y|ies)|edge-?cases?)\b|< 0|<= 0|limit\.current >= 0/i.test(userText);
  const boundaryCodeFixed =
    capacityCode.includes(">= 0") ||
    capacityCode.includes("> 0") ||
    capacityCode.includes("limit.current >= 0") ||
    (userTurns.length >= 2 && boundaryChatFixed);

  const isBoundaryFixed = boundaryChatFixed || boundaryCodeFixed;

  const bugs: PlantedBugAuditItem[] = [
    {
      id: "currency",
      name: "Currency & Float Precision",
      category: "Statutory Math Invariant",
      description: "Floating-point division (cents / 100) causes IEEE-754 drift or defaults to USD instead of AUD.",
      status: isCurrencyFixed ? "FIXED" : "MISSED",
      evidence: isCurrencyFixed
        ? "Verified integer-cents calculation and avoided floating-point currency drift."
        : undefined,
      remedy: "You forgot to check the currency: floating-point division violates statutory integer-cents precision.",
    },
    {
      id: "privacy",
      name: "Data Privacy & Identity Leak",
      category: "PII & Compliance Invariant",
      description: "Audit logger masks email addresses but leaves candidate/user identity field (userId) unmasked in JSON logs.",
      status: isPrivacyFixed ? "FIXED" : "MISSED",
      evidence: isPrivacyFixed
        ? "Identified unmasked identity logging and enforced PII sanitization in audit output."
        : undefined,
      remedy: "You forgot to check data privacy: raw userId identity was logged in unmasked system audit output.",
    },
    {
      id: "boundary",
      name: "Boundary & Capacity Guard",
      category: "Defensive Robustness Invariant",
      description: "Capacity limit check lacks negative number / underflow validation (< 0), allowing corrupted counts through.",
      status: isBoundaryFixed ? "FIXED" : "MISSED",
      evidence: isBoundaryFixed
        ? "Enforced capacity boundary guards and validated against negative underflow (< 0)."
        : undefined,
      remedy: "You forgot to check boundary limits: capacity validation allowed negative numbers / underflow through.",
    },
  ];

  const fixedBugs = bugs.filter((b) => b.status === "FIXED");
  const missedBugs = bugs.filter((b) => b.status === "MISSED");
  const foundCount = fixedBugs.length;
  const totalCount = 3;

  let summary: string;
  if (foundCount === 3) {
    summary = "3/3 bugs found: Outstanding zero-trust rigour! You caught and fixed all 3 planted flaws: currency precision, data privacy, and boundary limits.";
  } else if (foundCount === 2) {
    const missedName = missedBugs[0].name.toLowerCase();
    summary = `2/3 bugs found: Great vigilance! You caught ${fixedBugs.map((b) => b.name).join(" and ")}, but forgot to check ${missedName}.`;
  } else if (foundCount === 1) {
    const caughtName = fixedBugs[0].name;
    const missedNames = missedBugs.map((b) => b.name.toLowerCase()).join(" and ");
    summary = `1/3 bugs found: You caught ${caughtName}, but forgot to check ${missedNames}.`;
  } else {
    summary = "0/3 bugs found: You relied on default AI output and forgot to check currency precision, data privacy, and boundary limits.";
  }

  return {
    foundCount,
    totalCount,
    bugs,
    summary,
  };
}
