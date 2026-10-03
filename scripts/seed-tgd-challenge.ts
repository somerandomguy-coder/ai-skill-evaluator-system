import { prisma } from "../src/lib/db";
import { TGD_CHALLENGE_VIEW, TGD_EVALUATION_VIEW } from "../src/lib/fixtures/tgd-simulation-eval";
import { toJson } from "../src/lib/json";
import { buildRoleStarterTemplate } from "../src/lib/engine/starter-template";

async function seedTgd() {
  console.log("Seeding Total Game Development challenge and evaluation...");

  // 1. Ensure User
  await prisma.user.upsert({
    where: { id: "alex-mercer" },
    update: {},
    create: {
      id: "alex-mercer",
      email: "alex.mercer@example.com",
      name: "Alex Mercer",
      role: "CANDIDATE",
    },
  });

  // 2. Ensure Job Submission
  const submission = await prisma.jobSubmission.upsert({
    where: { id: "sub-tgd-rts-sim" },
    update: {},
    create: {
      id: "sub-tgd-rts-sim",
      userId: "alex-mercer",
      rawJd: "Total Game Development Melbourne Junior AI Simulation Systems Developer",
      sourceUrl: "https://totalgamedev.com.au/careers/junior-sim-developer",
      parsedJd: toJson(TGD_CHALLENGE_VIEW.job),
      companyResearch: toJson(TGD_CHALLENGE_VIEW.research),
    },
  });

  // 3. Ensure Challenge
  const starter = buildRoleStarterTemplate({
    title: TGD_CHALLENGE_VIEW.title,
    brief: TGD_CHALLENGE_VIEW.brief,
    technicalInvariants: TGD_CHALLENGE_VIEW.technicalInvariants,
    starterSchemas: TGD_CHALLENGE_VIEW.starterSchemas,
  });

  const challenge = await prisma.challenge.upsert({
    where: { id: "verified-tgd-rts-sim" },
    update: {
      title: TGD_CHALLENGE_VIEW.title,
      brief: TGD_CHALLENGE_VIEW.brief,
      domainContext: TGD_CHALLENGE_VIEW.domainContext,
      timeboxMinutes: 120,
      starterTemplate: toJson(starter),
      rubricVersion: "SFIA-9-ECD-v2",
    },
    create: {
      id: "verified-tgd-rts-sim",
      jobSubmissionId: submission.id,
      title: TGD_CHALLENGE_VIEW.title,
      brief: TGD_CHALLENGE_VIEW.brief,
      domainContext: TGD_CHALLENGE_VIEW.domainContext,
      timeboxMinutes: 120,
      starterTemplate: toJson(starter),
      rubricVersion: "SFIA-9-ECD-v2",
      meta: toJson({
        tier: "TIER_1_VERIFIED",
        sfiaProfile: TGD_CHALLENGE_VIEW.sfiaProfile,
        technicalInvariants: TGD_CHALLENGE_VIEW.technicalInvariants,
        verification: TGD_CHALLENGE_VIEW.verification,
      }),
    },
  });

  // 4. Ensure Requirements
  for (const r of TGD_CHALLENGE_VIEW.requirements) {
    await prisma.requirement.upsert({
      where: { id: r.id },
      update: {
        statement: r.statement,
        weight: r.weight,
        category: r.category,
      },
      create: {
        id: r.id,
        challengeId: challenge.id,
        category: r.category,
        statement: r.statement,
        weight: r.weight,
      },
    });
  }

  // 5. Ensure Session
  const session = await prisma.buildSession.upsert({
    where: { id: "tgd-sim-session" },
    update: {
      status: "SUBMITTED",
      submittedAt: new Date("2026-03-25T10:30:00Z"),
    },
    create: {
      id: "tgd-sim-session",
      challengeId: challenge.id,
      userId: "alex-mercer",
      status: "SUBMITTED",
      startedAt: new Date("2026-03-25T10:00:00Z"),
      submittedAt: new Date("2026-03-25T10:30:00Z"),
    },
  });

  // 6. Ensure Evaluation
  const perRequirement = TGD_EVALUATION_VIEW.results.map((r) => ({
    requirementId: r.requirementId,
    score: r.score,
    confidence: r.confidence,
    evidence: r.evidence,
    rationale: r.rationale,
  }));

  await prisma.evaluation.upsert({
    where: { id: "tgd-rts-sim-eval" },
    update: {
      overallScore: 94,
      confidence: 0.96,
      perRequirement: toJson(perRequirement),
      strengths: TGD_EVALUATION_VIEW.strengths,
      gaps: TGD_EVALUATION_VIEW.gaps,
      reviewStatus: "REVIEWED",
    },
    create: {
      id: "tgd-rts-sim-eval",
      buildSessionId: session.id,
      overallScore: 94,
      confidence: 0.96,
      perRequirement: toJson(perRequirement),
      strengths: TGD_EVALUATION_VIEW.strengths,
      gaps: TGD_EVALUATION_VIEW.gaps,
      reviewStatus: "REVIEWED",
      source: "ai",
      rubricVersion: "SFIA-9-ECD-v2",
      escalationDetail: toJson([]),
    },
  });

  console.log("Successfully seeded Total Game Development challenge and evaluation in DB!");
}

seedTgd().catch(console.error);
