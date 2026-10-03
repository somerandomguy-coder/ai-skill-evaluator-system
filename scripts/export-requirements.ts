import { prisma } from "../src/lib/db";
import { VERIFIED_CHALLENGE_BANK } from "../src/lib/engine/verified-bank";
import * as fs from "node:fs";
import * as path from "node:path";

interface RequirementExportRecord {
  requirementId: string;
  challengeId: string;
  challengeTitle: string;
  employer: string;
  roleTitle: string;
  category: string;
  statement: string;
  weight: number;
  sfiaLevel?: number;
  injectedTrap?: string | null;
  successSignals: string[];
  failureModes: string[];
}

async function exportRequirements() {
  const exportDir = path.resolve(process.cwd(), "data-export");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const records: RequirementExportRecord[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch from Database
  try {
    const dbRequirements = await prisma.requirement.findMany({
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            meta: true,
            jobSubmission: {
              select: {
                parsedJd: true,
              },
            },
          },
        },
      },
    });

    console.log(`Fetched ${dbRequirements.length} requirements from Prisma DB.`);

    for (const req of dbRequirements) {
      const ch = req.challenge;
      let employer = "Enterprise";
      let roleTitle = ch.title;
      let sfiaLevel = 3;

      if (ch.meta) {
        try {
          const metaObj = typeof ch.meta === "string" ? JSON.parse(ch.meta) : ch.meta;
          if (metaObj.sfiaProfile?.level) sfiaLevel = metaObj.sfiaProfile.level;
        } catch {}
      }

      if (ch.jobSubmission?.parsedJd) {
        try {
          const parsed = typeof ch.jobSubmission.parsedJd === "string" 
            ? JSON.parse(ch.jobSubmission.parsedJd) 
            : ch.jobSubmission.parsedJd;
          if (parsed.employer) employer = parsed.employer;
          if (parsed.roleTitle) roleTitle = parsed.roleTitle;
        } catch {}
      }

      seenIds.add(req.id);
      records.push({
        requirementId: req.id,
        challengeId: ch.id,
        challengeTitle: ch.title,
        employer,
        roleTitle,
        category: req.category,
        statement: req.statement,
        weight: req.weight,
        sfiaLevel,
        injectedTrap: null,
        successSignals: [],
        failureModes: [],
      });
    }
  } catch (err) {
    console.warn("Could not query Prisma DB (or empty):", err);
  }

  // 2. Fetch from VERIFIED_CHALLENGE_BANK
  for (const ch of VERIFIED_CHALLENGE_BANK) {
    for (const r of ch.rubric || []) {
      const fullId = `${ch.id}-${r.id}`;
      if (!seenIds.has(fullId)) {
        seenIds.add(fullId);
        records.push({
          requirementId: fullId,
          challengeId: ch.id,
          challengeTitle: ch.roleTitle,
          employer: ch.companyName,
          roleTitle: ch.roleTitle,
          category: r.category,
          statement: r.statement,
          weight: r.weight,
          sfiaLevel: r.sfiaLevel || ch.sfiaProfile?.level || 3,
          injectedTrap: r.injectedTrap ?? null,
          successSignals: r.successSignals || [],
          failureModes: r.failureModes || [],
        });
      }
    }
  }

  console.log(`Total requirements collected: ${records.length}`);

  // 3. Export to JSON
  const jsonPath = path.join(exportDir, "requirements-dataset.json");
  fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2), "utf8");
  console.log(`Saved JSON export to: ${jsonPath}`);

  // 4. Export to CSV
  const csvPath = path.join(exportDir, "requirements-dataset.csv");
  const headers = [
    "requirementId",
    "challengeId",
    "challengeTitle",
    "employer",
    "roleTitle",
    "category",
    "statement",
    "weight",
    "sfiaLevel",
    "injectedTrap",
    "successSignals",
    "failureModes",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    headers.join(","),
    ...records.map((r) =>
      [
        escapeCsv(r.requirementId),
        escapeCsv(r.challengeId),
        escapeCsv(r.challengeTitle),
        escapeCsv(r.employer),
        escapeCsv(r.roleTitle),
        escapeCsv(r.category),
        escapeCsv(r.statement),
        r.weight,
        r.sfiaLevel ?? 3,
        escapeCsv(r.injectedTrap),
        escapeCsv(r.successSignals.join(" | ")),
        escapeCsv(r.failureModes.join(" | ")),
      ].join(",")
    ),
  ];

  fs.writeFileSync(csvPath, csvRows.join("\n"), "utf8");
  console.log(`Saved CSV export to: ${csvPath}`);
}

exportRequirements().catch(console.error);
