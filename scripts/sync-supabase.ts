/**
 * Supabase Synchronization Script
 * 
 * Synchronizes the 100 Curated Production Challenges and 100 Clean Requirements
 * directly into the Supabase PostgreSQL database via Prisma.
 * 
 * Usage:
 *   npx tsx scripts/sync-supabase.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { prisma } from "../src/lib/db";

interface CleanRequirement {
  requirementId: string;
  challengeId: string;
  challengeTitle: string;
  employer: string;
  roleTitle: string;
  category: string;
  statement: string;
  weight: number;
  sfiaLevel: number;
  injectedTrap: string | null;
  successSignals: string[];
  failureModes: string[];
}

interface ChallengeExport {
  id: string;
  employer: string;
  roleTitle: string;
  challengeTitle: string;
  domain: string;
  sfiaLevel: number;
  injectedTrap: string;
  brief: string;
  timeboxMinutes: number;
  starterTemplate: Record<string, string>;
  rubric: Array<{
    category: string;
    statement: string;
    weight: number;
    signals: string[];
    failures: string[];
  }>;
  cleanRequirement: {
    category: string;
    statement: string;
    weight: number;
    signals: string[];
    failures: string[];
  };
}

async function syncToSupabase() {
  console.log("==========================================================");
  console.log("   SYNCING 100 CURATED BENCHMARKS TO SUPABASE POSTGRESQL  ");
  console.log("==========================================================");

  // 1. Check initial DB counts
  const initialChCount = await prisma.challenge.count();
  const initialReqCount = await prisma.requirement.count();
  console.log(`Current Supabase state: ${initialChCount} challenges, ${initialReqCount} requirements.`);

  // 2. Load dataset exports
  const challengesPath = path.join(process.cwd(), "data-export", "challenges-dataset-100.json");
  const requirementsPath = path.join(process.cwd(), "data-export", "requirements-dataset.json");

  if (!fs.existsSync(challengesPath) || !fs.existsSync(requirementsPath)) {
    throw new Error("Dataset files not found in data-export/. Run scripts/build_curated_100.py first.");
  }

  const challenges: ChallengeExport[] = JSON.parse(fs.readFileSync(challengesPath, "utf-8"));
  const cleanReqs: CleanRequirement[] = JSON.parse(fs.readFileSync(requirementsPath, "utf-8"));

  console.log(`Loaded ${challenges.length} challenges and ${cleanReqs.length} clean requirements from data-export/.`);

  // 3. Ensure a Curator User exists
  const curatorEmail = "system.curator@proofcraft.dev";
  const user = await prisma.user.upsert({
    where: { email: curatorEmail },
    update: {
      name: "ProofCraft Benchmark Curator",
      role: "MENTOR",
    },
    create: {
      id: "curator-system-user",
      email: curatorEmail,
      name: "ProofCraft Benchmark Curator",
      role: "MENTOR",
    },
  });
  console.log(`Curator user verified: ${user.name} (${user.id})`);

  // Map clean requirements by challengeId
  const reqMap = new Map<string, CleanRequirement>();
  for (const r of cleanReqs) {
    reqMap.set(r.challengeId, r);
  }

  let syncedChallenges = 0;
  let syncedRequirements = 0;

  // 4. Upsert each challenge and its clean requirement
  for (const ch of challenges) {
    const subId = `sub-${ch.id}`;
    
    // Upsert JobSubmission
    await prisma.jobSubmission.upsert({
      where: { id: subId },
      update: {
        rawJd: ch.brief,
        parsedJd: {
          employer: ch.employer,
          roleTitle: ch.roleTitle,
          domain: ch.domain,
          sfiaLevel: ch.sfiaLevel,
        },
        companyResearch: {
          companyName: ch.employer,
          domain: ch.domain,
          verified: true,
        },
        fromDemoCache: true,
      },
      create: {
        id: subId,
        userId: user.id,
        rawJd: ch.brief,
        parsedJd: {
          employer: ch.employer,
          roleTitle: ch.roleTitle,
          domain: ch.domain,
          sfiaLevel: ch.sfiaLevel,
        },
        companyResearch: {
          companyName: ch.employer,
          domain: ch.domain,
          verified: true,
        },
        fromDemoCache: true,
      },
    });

    // Upsert Challenge
    await prisma.challenge.upsert({
      where: { id: ch.id },
      update: {
        title: ch.challengeTitle,
        brief: ch.brief,
        domainContext: `${ch.employer} — ${ch.domain} (SFIA Level ${ch.sfiaLevel})`,
        timeboxMinutes: ch.timeboxMinutes || 60,
        starterTemplate: ch.starterTemplate,
        rubricVersion: "sfia-9-ecd-v1",
        meta: {
          employer: ch.employer,
          roleTitle: ch.roleTitle,
          domain: ch.domain,
          sfiaProfile: { level: ch.sfiaLevel },
          injectedTrap: ch.injectedTrap,
          rubric: ch.rubric,
        },
      },
      create: {
        id: ch.id,
        jobSubmissionId: subId,
        title: ch.challengeTitle,
        brief: ch.brief,
        domainContext: `${ch.employer} — ${ch.domain} (SFIA Level ${ch.sfiaLevel})`,
        timeboxMinutes: ch.timeboxMinutes || 60,
        starterTemplate: ch.starterTemplate,
        rubricVersion: "sfia-9-ecd-v1",
        meta: {
          employer: ch.employer,
          roleTitle: ch.roleTitle,
          domain: ch.domain,
          sfiaProfile: { level: ch.sfiaLevel },
          injectedTrap: ch.injectedTrap,
          rubric: ch.rubric,
        },
      },
    });
    syncedChallenges++;

    // Sync the clean premier requirement
    const cr = reqMap.get(ch.id);
    if (cr) {
      const reqDbId = cr.requirementId;
      await prisma.requirement.upsert({
        where: { id: reqDbId },
        update: {
          challengeId: ch.id,
          category: cr.category,
          statement: cr.statement,
          weight: cr.weight,
          successSignals: cr.successSignals,
          failureModes: cr.failureModes,
        },
        create: {
          id: reqDbId,
          challengeId: ch.id,
          category: cr.category,
          statement: cr.statement,
          weight: cr.weight,
          successSignals: cr.successSignals,
          failureModes: cr.failureModes,
        },
      });
      syncedRequirements++;
    }
  }

  // 5. Final summary
  const finalChCount = await prisma.challenge.count();
  const finalReqCount = await prisma.requirement.count();

  console.log("\n==========================================================");
  console.log("   SUPABASE SYNC SUCCESSFUL!");
  console.log(`   Synced Challenges:    ${syncedChallenges}/100`);
  console.log(`   Synced Requirements:  ${syncedRequirements}/100`);
  console.log(`   Total Challenges DB:  ${finalChCount}`);
  console.log(`   Total Requirements:   ${finalReqCount}`);
  console.log("==========================================================");
}

syncToSupabase()
  .catch((err) => {
    console.error("Supabase sync failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
