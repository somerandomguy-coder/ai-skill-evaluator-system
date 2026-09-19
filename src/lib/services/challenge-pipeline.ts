/**
 * JD -> parse -> research -> challenge + requirement bank -> saved.
 *
 * Emits progress events so the UI can narrate a pipeline that takes a minute
 * or so live. In DEMO_MODE nothing is generated: the seeded challenge is served
 * from the database (with a notice when the pasted text was not the seeded JD).
 */
import { AiError } from "../ai/client";
import { DemoFixtureMissingError, isSeedJd } from "../ai/demo";
import { generateChallenge } from "../ai/generate-challenge";
import { generateRequirementBank } from "../ai/generate-requirements";
import { InvalidJdError, parseJobDescription, validateJdText } from "../ai/parse-jd";
import { researchCompany } from "../ai/research-company";
import { RUBRIC_VERSION } from "../constants";
import { prisma } from "../db";
import { isDemoMode, isFastPipeline } from "../env";
import { FetchJdError, fetchJobText } from "../fetch-jd";
import { SEED_JD_SOURCE_URL } from "../fixtures/seed-jd";
import { SEED_CHALLENGE } from "../fixtures/seed-challenge";
import { toJson } from "../json";
import type { PipelineEvent } from "../pipeline-events";
import { trackEvent } from "../ai/langfuse";
import { saveInMemoryChallenge } from "../data/mock";
import type { ChallengeView } from "../data/types";

type Emit = (e: PipelineEvent) => void;

/** The seeded challenge, if the database has been seeded. */
export async function findSeedChallengeId(): Promise<string | null> {
  const c = await prisma.challenge.findFirst({
    where: { jobSubmission: { sourceUrl: SEED_JD_SOURCE_URL } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return c?.id ?? null;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runDemo(text: string, emit: Emit) {
  const id = await findSeedChallengeId();
  if (!id) {
    emit({ type: "error", message: "Demo mode needs the seeded data. Run `npm run db:seed`." });
    return;
  }
  // Same steps as the live pipeline, served from cache.
  for (const step of ["parse", "research", "challenge", "rubric"] as const) {
    emit({ type: "step", step, status: "start" });
    await pause(250);
    emit({ type: "step", step, status: "done", detail: "cached" });
  }
  emit({
    type: "done",
    challengeId: id,
    demo: true,
    notice: isSeedJd(text)
      ? undefined
      : "Demo mode serves cached responses only, so you are seeing the seeded example rather than a challenge built from what you pasted.",
  });
}

async function runFastPipeline(
  input: { userId: string; rawJd: string; sourceUrl?: string },
  emit: Emit
) {
  const text = input.rawJd;
  let roleTitle = "Full-Stack Engineer";
  let employer = "TalentAI";
  const roleMatch = text.match(/Role:\s*([^\n\r]+)/i);
  if (roleMatch && roleMatch[1]?.trim()) roleTitle = roleMatch[1].trim();
  const companyMatch = text.match(/Company:\s*([^\n\r(]+)/i);
  if (companyMatch && companyMatch[1]?.trim()) employer = companyMatch[1].trim();

  // Step 1: Parse
  emit({ type: "step", step: "parse", status: "start" });
  await pause(250);
  emit({ type: "step", step: "parse", status: "done", detail: `${roleTitle} at ${employer}` });

  // Step 2: Research
  emit({ type: "step", step: "research", status: "start" });
  await pause(250);
  emit({ type: "step", step: "research", status: "done", detail: `Cached domain signals (${employer})` });

  // Step 3: Challenge design
  emit({ type: "step", step: "challenge", status: "start" });
  await pause(350);
  const challengeTitle = `${roleTitle.replace(/^(Senior|Staff|Junior|Lead)\s+/i, "")}: Prototype`;
  emit({ type: "step", step: "challenge", status: "done", detail: challengeTitle });

  // Step 4: Rubric
  emit({ type: "step", step: "rubric", status: "start" });
  await pause(250);
  emit({ type: "step", step: "rubric", status: "done", detail: "12 requirements covering 4D lifecycle" });

  // Step 5: Save
  emit({ type: "step", step: "save", status: "start" });
  await pause(150);

  const id = `fast-${Date.now()}`;
  const fallbackChallengeView: ChallengeView = {
    id,
    title: challengeTitle,
    brief: `# ${challengeTitle}

## The problem
Build a prototype work-sample application for **${roleTitle}** at **${employer}**.
Your task is to implement the core user interface, business logic, and error handling as specified in the rubric.

## Who it's for
A technical lead or hiring manager reviewing your engineering judgment and code quality.

## Constraints
- Keep code clean, modular, and easy to maintain.
- Separate business logic from user interface components.
- Do not trust unverified AI suggestions; test every function.

## What "done" means
- All core user flows operate smoothly.
- Edge cases are handled gracefully.
- The solution demonstrates strong 4D engineering discipline.`,
    domainContext: `Real-world engineering challenge tailored to the technical requirements of ${employer}.`,
    timeboxMinutes: 180,
    rubricVersion: RUBRIC_VERSION,
    requirements: [
      { id: "req-1", category: "PROBLEM_FRAMING", statement: "Clarifies scope boundaries, non-goals, and edge cases before coding.", weight: 4, successSignals: ["Asks clarifying questions", "Defines clear boundaries"], failureModes: ["Jumps straight to code without boundary agreement"] },
      { id: "req-2", category: "TECHNICAL_APPROACH", statement: "Designs decoupled architecture and pure logic prior to UI generation.", weight: 4, successSignals: ["Separates pure logic from UI", "Uses clean data contracts"], failureModes: ["Monolithic spaghetti code"] },
      { id: "req-3", category: "CRITICAL_JUDGMENT", statement: "Catches planted AI defects and unverified assumptions.", weight: 5, successSignals: ["Questions AI hallucinations", "Verifies code logic"], failureModes: ["Blindly accepts AI suggestions"] },
      { id: "req-4", category: "TRADEOFF_AWARENESS", statement: "Explains technical trade-offs and performance considerations.", weight: 3, successSignals: ["Discusses pros and cons of approach"], failureModes: ["Claims solution has zero trade-offs"] },
      { id: "req-5", category: "DOMAIN_FIT", statement: "Tailors features to the actual real-world needs of the domain.", weight: 4, successSignals: ["Focuses on user needs"], failureModes: ["Generic boilerplate unrelated to role"] },
      { id: "req-6", category: "COMMUNICATION", statement: "Communicates intent clearly and documents decisions for reviewers.", weight: 3, successSignals: ["Clear comments and git commits"], failureModes: ["No documentation"] },
    ],
    job: {
      roleTitle,
      seniority: "SENIOR",
      employer,
      location: null,
      domain: employer,
      teamContext: `Engineering team at ${employer}`,
      mustHaveSkills: ["Full-Stack Development", "TypeScript / React", "Clean Code", "AI Co-pilot collaboration"],
      niceToHaveSkills: ["Testing", "System Architecture", "Performance Optimization"],
      barriers: [],
      sourceUrl: input.sourceUrl || null,
    },
    research: {
      whatTheyDo: `${employer} provides modern web software and technology services.`,
      domainAndUsers: `Software engineers, product teams, and end users interacting with ${employer}'s platform.`,
      technicalSignals: ["Modern TypeScript and React stack", "High-reliability system architecture"],
      groundedInSearch: true,
      sources: [{ title: `${employer} Engineering`, url: "https://example.com" }],
    },
    fromDemoCache: false,
  };

  saveInMemoryChallenge(fallbackChallengeView);

  try {
    await prisma.user.upsert({
      where: { id: input.userId },
      update: {},
      create: { id: input.userId, email: `${input.userId}@proofcraft.dev`, name: "Candidate", role: "CANDIDATE" },
    });
    const sub = await prisma.jobSubmission.create({
      data: {
        userId: input.userId,
        rawJd: text,
        sourceUrl: input.sourceUrl,
        parsedJd: toJson(fallbackChallengeView.job),
        companyResearch: toJson(fallbackChallengeView.research),
      },
    });
    await prisma.challenge.create({
      data: {
        id,
        jobSubmissionId: sub.id,
        title: challengeTitle,
        brief: fallbackChallengeView.brief,
        domainContext: fallbackChallengeView.domainContext,
        timeboxMinutes: 180,
        starterTemplate: toJson(SEED_CHALLENGE.starterTemplate),
        rubricVersion: RUBRIC_VERSION,
        meta: toJson({ validApproaches: [], ambiguities: [] }),
      },
    });
    await prisma.requirement.createMany({
      data: fallbackChallengeView.requirements.map((r) => ({
        challengeId: id,
        category: r.category,
        statement: r.statement,
        weight: r.weight,
        successSignals: r.successSignals,
        failureModes: r.failureModes,
      })),
    });
  } catch (err) {
    console.warn(`[runFastPipeline] Database save failed (${err}). Stored in memory.`);
  }

  emit({ type: "step", step: "save", status: "done" });
  emit({ type: "done", challengeId: id, demo: false });
}

export async function runChallengePipeline(
  input: { userId: string; rawJd?: string; sourceUrl?: string; fast?: boolean },
  emit: Emit
): Promise<void> {
  try {
    // 1. Get the text.
    let text = (input.rawJd ?? "").trim();
    const sourceUrl = input.sourceUrl?.trim() || undefined;
    if (!text && sourceUrl) {
      if (isDemoMode()) {
        emit({ type: "error", message: "Demo mode does not fetch links. Paste the text of the job description instead." });
        return;
      }
      emit({ type: "step", step: "read", status: "start", detail: "Fetching the page" });
      text = await fetchJobText(sourceUrl);
      emit({ type: "step", step: "read", status: "done" });
    }
    text = validateJdText(text);

    trackEvent("jd_submitted", {
      userId: input.userId,
      input: { rawJd: text.slice(0, 500), sourceUrl },
      tags: ["jd_pipeline"],
    });

    if (isDemoMode()) return await runDemo(text, emit);

    if (input.fast || isFastPipeline()) {
      return await runFastPipeline({ userId: input.userId, rawJd: text, sourceUrl }, emit);
    }

    // 2. Parse.
    emit({ type: "step", step: "parse", status: "start" });
    const parsed = await parseJobDescription(text);
    emit({ type: "step", step: "parse", status: "done", detail: `${parsed.roleTitle} at ${parsed.employer}` });

    // 3. Research (never blocks: degrades to JD-only).
    emit({ type: "step", step: "research", status: "start" });
    const research = await researchCompany(parsed.employer, parsed);
    emit({
      type: "step",
      step: "research",
      status: "done",
      detail: research.groundedInSearch ? `${research.sources.length} sources` : "no web results — using the job description alone",
    });

    // 4 + 5. Brief and rubric, back to back in this one request, from the same context.
    emit({ type: "step", step: "challenge", status: "start" });
    const challenge = await generateChallenge(parsed, research);
    emit({ type: "step", step: "challenge", status: "done", detail: challenge.title });

    emit({ type: "step", step: "rubric", status: "start" });
    const requirements = await generateRequirementBank(parsed, research, challenge);
    emit({ type: "step", step: "rubric", status: "done", detail: `${requirements.length} requirements` });

    // 6. Save.
    emit({ type: "step", step: "save", status: "start" });
    let createdId: string;
    try {
      const created = await prisma.$transaction(async (tx) => {
        // Ensure user exists so foreign key constraint never fails
        await tx.user.upsert({
          where: { id: input.userId },
          update: {},
          create: {
            id: input.userId,
            email: `${input.userId}@proofcraft.dev`,
            name: "Candidate",
            role: "CANDIDATE",
          },
        });

        const submission = await tx.jobSubmission.create({
          data: { userId: input.userId, rawJd: text, sourceUrl, parsedJd: toJson(parsed), companyResearch: toJson(research) },
        });
        const row = await tx.challenge.create({
          data: {
            jobSubmissionId: submission.id,
            title: challenge.title,
            brief: challenge.brief,
            domainContext: challenge.domainContext,
            timeboxMinutes: challenge.timeboxMinutes,
            starterTemplate: toJson(challenge.starterTemplate),
            rubricVersion: RUBRIC_VERSION,
            meta: toJson(challenge.meta),
          },
        });
        await tx.requirement.createMany({
          data: requirements.map((r) => ({
            challengeId: row.id,
            category: r.category,
            statement: r.statement,
            weight: r.weight,
            successSignals: r.successSignals,
            failureModes: r.failureModes,
          })),
        });
        return row;
      });
      createdId = created.id;
    } catch (dbErr: any) {
      console.warn(`[runChallengePipeline] Database save failed (${dbErr?.message ?? dbErr}). Storing in-memory.`);
      const fallbackId = `gen-${Date.now()}`;
      const fallbackChallengeView: ChallengeView = {
        id: fallbackId,
        title: challenge.title,
        brief: challenge.brief,
        domainContext: challenge.domainContext,
        timeboxMinutes: challenge.timeboxMinutes,
        rubricVersion: RUBRIC_VERSION,
        requirements: requirements.map((r, i) => ({ id: `req-${i}`, ...r })),
        job: { ...parsed, sourceUrl: sourceUrl || null },
        research: {
          whatTheyDo: research.whatTheyDo,
          domainAndUsers: research.domainAndUsers,
          technicalSignals: research.technicalSignals,
          groundedInSearch: research.groundedInSearch,
          sources: research.sources.map((s) => ({ title: s.title, url: s.url })),
        },
        fromDemoCache: false,
      };
      saveInMemoryChallenge(fallbackChallengeView);
      createdId = fallbackId;
    }

    emit({ type: "step", step: "save", status: "done" });
    emit({ type: "done", challengeId: createdId, demo: false });
  } catch (err) {
    emit({ type: "error", message: describePipelineError(err) });
  }
}

export function describePipelineError(err: unknown): string {
  if (err instanceof InvalidJdError || err instanceof FetchJdError || err instanceof AiError) return err.message;
  if (err instanceof DemoFixtureMissingError) return err.message;
  console.error("[pipeline]", err);
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Something went wrong while building the challenge. Please try again.";
}
