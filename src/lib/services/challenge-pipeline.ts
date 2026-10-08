/**
 * JD -> parse -> research -> challenge + requirement bank -> saved.
 *
 * Emits progress events so the UI can narrate a pipeline that takes a minute
 * or so live. In DEMO_MODE nothing is generated: the seeded challenge is served
 * from the database (with a notice when the pasted text was not the seeded JD).
 */
import { AiError } from "../ai/client";
import { classifyJd, enforceJdQuality } from "../ai/classify-jd";
import { DemoFixtureMissingError, isSeedJd } from "../ai/demo";
import { generateChallenge } from "../ai/generate-challenge";
import { generateRequirementBank } from "../ai/generate-requirements";
import { InvalidJdError, parseJobDescription, validateJdText } from "../ai/parse-jd";
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
import { buildRoleStarterTemplate } from "../engine/starter-template";
import { v2ToChallengeView, saveInMemoryChallenge } from "../data/mock";
import type { ChallengeView } from "../data/types";
import { saveChallengeAtomically } from "./challenge-persistence";

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
  input: { userId: string; userName?: string; userEmail?: string; rawJd: string; sourceUrl?: string },
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
  emit({ type: "step", step: "parse", status: "done", detail: `${roleTitle} at ${employer}` });

  // Step 2: Challenge design (V2 3-Tier Resolution)
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
  emit({ type: "step", step: "challenge", status: "done", detail: `${challengeTitle} · ${tierLabel}` });

  // Step 3: Rubric
  emit({ type: "step", step: "rubric", status: "start" });
  emit({
    type: "step",
    step: "rubric",
    status: "done",
    detail: `${resolved.rubric.length} requirements (SFIA Level ${resolved.sfiaProfile.level})`,
  });

  // Step 4: Save atomically (M08)
  emit({ type: "step", step: "save", status: "start" });

  const { challengeId } = await saveChallengeAtomically({
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    rawJd: text,
    sourceUrl: input.sourceUrl || null,
    parsedJd: { roleTitle, employer, sourceUrl: input.sourceUrl || null },
    companyResearch: { whatTheyDo: "", domainAndUsers: "", technicalSignals: [], groundedInSearch: false, sources: [] },
    challenge: resolved,
    tier: resolution.tierResolved,
    similarityScore: resolution.similarityScore,
  });

  emit({ type: "step", step: "save", status: "done" });
  emit({ type: "done", challengeId, demo: false });
}

export async function runChallengePipeline(
  input: { userId: string; userName?: string; userEmail?: string; rawJd?: string; sourceUrl?: string; fast?: boolean },
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

    // 2. Classify: screen for junk, too-vague, non-JD text, and prompt-injection attempts.
    // Mandatory for all non-demo runs; cannot be bypassed by client fast flag.
    emit({ type: "step", step: "classify", status: "start" });
    const jdQuality = await classifyJd(text);
    emit({ type: "jd_quality", verdict: jdQuality });
    emit({
      type: "step",
      step: "classify",
      status: "done",
      detail: jdQuality.cheatingAttempt ? "possible injection attempt" : jdQuality.type === "good" ? "looks like a real job ad" : jdQuality.type,
    });
    enforceJdQuality(jdQuality);

    // Fast mode: user-selected or server-configured fast generation (after mandatory screening)
    const shouldRunFast = isFastPipeline() || input.fast === true;
    if (shouldRunFast) {
      return await runFastPipeline(
        { userId: input.userId, userName: input.userName, userEmail: input.userEmail, rawJd: text, sourceUrl },
        emit
      );
    }

    // 3. Parse.
    emit({ type: "step", step: "parse", status: "start" });
    const parsed = await parseJobDescription(text);
    emit({ type: "step", step: "parse", status: "done", detail: `${parsed.roleTitle} at ${parsed.employer}` });

    // 4. Fast Domain Signals (direct from JD, zero web search latency).
    const research = {
      whatTheyDo: `Engineering organisation specialising in ${parsed.roleTitle} solutions.`,
      domainAndUsers: `Internal and external users of ${parsed.employer}'s systems.`,
      technicalSignals: parsed.mustHaveSkills.slice(0, 5),
      groundedInSearch: false,
      sources: [] as Array<{ title: string; url: string }>,
    };

    // 5. 3-Tier Resolution Engine: SFIA 9 & Evidence-Centered Design
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

    // 6. Save atomically (M08)
    emit({ type: "step", step: "save", status: "start" });
    const { challengeId: createdId } = await saveChallengeAtomically({
      userId: input.userId,
      userEmail: input.userEmail,
      userName: input.userName,
      rawJd: text,
      sourceUrl,
      parsedJd: parsed,
      companyResearch: research,
      challenge: resolved,
      tier: resolution.tierResolved,
      similarityScore: resolution.similarityScore,
    });

    emit({ type: "step", step: "save", status: "done" });
    emit({ type: "done", challengeId: createdId, demo: false });
  } catch (err) {
    emit({ type: "error", message: describePipelineError(err) });
  }
}

export function describePipelineError(err: unknown): string {
  if (err instanceof InvalidJdError || err instanceof FetchJdError) return err.message;
  if (err instanceof DemoFixtureMissingError) return err.message;
  if (err instanceof AiError) {
    return "AI generation provider error. Please try again.";
  }
  console.error("[pipeline]", err);
  // Do NOT leak raw database or provider exception text to candidate
  return "Something went wrong while building the challenge. Please try again.";
}
