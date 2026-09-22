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
import { resolveChallenge } from "../engine/resolver";
import { v2ToChallengeView, saveInMemoryChallenge } from "../data/mock";
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
  await pause(200);
  emit({ type: "step", step: "parse", status: "done", detail: `${roleTitle} at ${employer}` });

  // Step 2: Research
  emit({ type: "step", step: "research", status: "start" });
  await pause(200);
  emit({ type: "step", step: "research", status: "done", detail: `Domain signals for ${employer}` });

  // Step 3: Challenge design (V2 3-Tier Resolution)
  emit({ type: "step", step: "challenge", status: "start" });
  const resolution = await resolveChallenge(text, employer);
  const resolved = resolution.challenge;
  const challengeTitle = resolved.roleTitle;
  const tierLabel =
    resolution.tierResolved === "TIER_1_VERIFIED"
      ? "MentorME Verified (Tier 1)"
      : resolution.tierResolved === "TIER_2_CACHED"
        ? "Cached Assessment (Tier 2)"
        : "Tailored Track (Tier 3)";
  await pause(200);
  emit({ type: "step", step: "challenge", status: "done", detail: `${challengeTitle} · ${tierLabel}` });

  // Step 4: Rubric
  emit({ type: "step", step: "rubric", status: "start" });
  await pause(150);
  emit({
    type: "step",
    step: "rubric",
    status: "done",
    detail: `${resolved.rubric.length} requirements (SFIA Level ${resolved.sfiaProfile.level})`,
  });

  // Step 5: Save
  emit({ type: "step", step: "save", status: "start" });
  await pause(100);

  const id = `v2-${Date.now()}`;
  const fallbackChallengeView: ChallengeView = {
    ...v2ToChallengeView(resolved),
    id,
    job: {
      ...v2ToChallengeView(resolved).job,
      roleTitle,
      employer,
      sourceUrl: input.sourceUrl || null,
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
        timeboxMinutes: fallbackChallengeView.timeboxMinutes,
        starterTemplate: toJson(SEED_CHALLENGE.starterTemplate),
        rubricVersion: "SFIA-8-ECD-v2",
        meta: toJson({
          validApproaches: [],
          ambiguities: [],
          tier: resolution.tierResolved,
          sfiaProfile: resolved.sfiaProfile,
          technicalInvariants: resolved.technicalInvariants,
          starterSchemas: resolved.starterSchemas,
          verification: resolved.verification,
          similarityScore: resolution.similarityScore,
        }),
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

    // Only run fast simulation if explicitly requested by client, or if FAST_PIPELINE is true and not explicitly disabled
    const shouldRunFast = input.fast === true || (isFastPipeline() && input.fast !== false);
    if (shouldRunFast) {
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

    // 4 + 5. 3-Tier Resolution Engine: SFIA 8 & Evidence-Centered Design
    emit({ type: "step", step: "challenge", status: "start" });
    const resolution = await resolveChallenge(text, parsed.employer);
    const resolved = resolution.challenge;
    const tierLabel =
      resolution.tierResolved === "TIER_1_VERIFIED"
        ? "MentorME Verified (Tier 1)"
        : resolution.tierResolved === "TIER_2_CACHED"
          ? "Cached Assessment (Tier 2)"
          : "Tailored Track (Tier 3)";
    emit({ type: "step", step: "challenge", status: "done", detail: `${resolved.roleTitle} · ${tierLabel}` });

    emit({ type: "step", step: "rubric", status: "start" });
    emit({
      type: "step",
      step: "rubric",
      status: "done",
      detail: `${resolved.rubric.length} requirements (SFIA Level ${resolved.sfiaProfile.level})`,
    });

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
            title: resolved.roleTitle,
            brief: resolved.briefMarkdown,
            domainContext: `Enterprise Australian assessment grounded in SFIA 8 standards for ${parsed.employer}.`,
            timeboxMinutes: resolved.sfiaProfile.level === 2 ? 120 : 180,
            starterTemplate: toJson(SEED_CHALLENGE.starterTemplate),
            rubricVersion: "SFIA-8-ECD-v2",
            meta: toJson({
              validApproaches: [],
              ambiguities: [],
              tier: resolution.tierResolved,
              sfiaProfile: resolved.sfiaProfile,
              technicalInvariants: resolved.technicalInvariants,
              starterSchemas: resolved.starterSchemas,
              verification: resolved.verification,
              similarityScore: resolution.similarityScore,
            }),
          },
        });
        await tx.requirement.createMany({
          data: resolved.rubric.map((r) => ({
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
        ...v2ToChallengeView(resolved),
        id: fallbackId,
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
