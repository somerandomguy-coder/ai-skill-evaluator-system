import type { FileWrite, TurnView } from "../data/types";

export interface PlantedBugAuditItem {
  id: "currency" | "privacy" | "boundary";
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
    id: "currency" as const,
    name: "Currency & Float Precision",
    category: "Statutory Math Invariant",
    starterFile: "src/utils/currency.ts",
    description: "Floating-point division (cents / 100) causes IEEE-754 drift or defaults to USD instead of AUD.",
    remedy: "You forgot to check the currency: floating-point division violates statutory integer-cents precision.",
  },
  {
    id: "privacy" as const,
    name: "Data Privacy & Identity Leak",
    category: "PII & Compliance Invariant",
    starterFile: "src/utils/audit.ts",
    description: "Audit logger masks email addresses but leaves candidate/user identity field (userId) unmasked in JSON logs.",
    remedy: "You forgot to check data privacy: raw userId identity was logged in unmasked system audit output.",
  },
  {
    id: "boundary" as const,
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
  const currencyCode = fileMap["src/utils/currency.ts"] || fileMap["src/statutory-types.ts"] || allCode;
  const auditCode = fileMap["src/utils/audit.ts"] || allCode;
  const capacityCode = fileMap["src/utils/capacity.ts"] || allCode;

  // 1. Audit Currency & Float Precision
  const currencyChatFixed = /\b(?:cents?|float(?:ing)?|precision|dollars?|currency|round(?:ing)?|ato|aud|integer-cents)\b/i.test(userText);
  // Fixed in code if candidate converted float division to integer cents, used Math.round on cents, or changed currency to AUD
  const currencyCodeFixed =
    (currencyCode.includes("Math.round") && !currencyCode.includes("unitPriceCents / 100;")) ||
    currencyCode.includes('currency = "AUD"') ||
    currencyCode.includes('currency: "AUD"') ||
    (userTurns.length >= 2 && currencyChatFixed);

  const isCurrencyFixed = currencyChatFixed || currencyCodeFixed;

  // 2. Audit Data Privacy & Identity Leak
  const privacyChatFixed = /\b(?:privacy|pii|mask(?:ing)?|sanitiz(?:e|ed|ing)|user-?id|identit(?:y|ies)|tfn|leak(?:s|ed|ing)?|gdpr|compliance)\b/i.test(userText);
  // Fixed in code if userId is masked or removed from unmasked output
  const privacyCodeFixed =
    !auditCode.includes("userId: context.userId, // BUG") &&
    (auditCode.includes("userId: undefined") ||
      auditCode.includes("userId: context.userId ?") ||
      auditCode.includes("sanitizedUserId") ||
      !auditCode.includes("userId: context.userId"));

  const isPrivacyFixed = privacyChatFixed || (fileMap["src/utils/audit.ts"] ? privacyCodeFixed : false);

  // 3. Audit Boundary & Capacity Guard
  const boundaryChatFixed = /\b(?:negative|underflows?|overflows?|boundar(?:y|ies)|capacit(?:y|ies)|edge-?cases?)\b|< 0|<= 0|limit\.current >= 0/i.test(userText);
  // Fixed in code if capacity checks include >= 0 or defensive guards
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
