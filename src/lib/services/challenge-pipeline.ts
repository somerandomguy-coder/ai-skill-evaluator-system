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
import { isDemoMode } from "../env";
import { FetchJdError, fetchJobText } from "../fetch-jd";
import { SEED_JD_SOURCE_URL } from "../fixtures/seed-jd";
import { toJson } from "../json";
import type { PipelineEvent } from "../pipeline-events";


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

export async function runChallengePipeline(
  input: { userId: string; rawJd?: string; sourceUrl?: string },
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

    if (isDemoMode()) return await runDemo(text, emit);

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
    const created = await prisma.$transaction(async (tx) => {
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
    emit({ type: "step", step: "save", status: "done" });
    emit({ type: "done", challengeId: created.id, demo: false });
  } catch (err) {
    emit({ type: "error", message: describePipelineError(err) });
  }
}

export function describePipelineError(err: unknown): string {
  if (err instanceof InvalidJdError || err instanceof FetchJdError || err instanceof AiError) return err.message;
  if (err instanceof DemoFixtureMissingError) return err.message;
  console.error("[pipeline]", err);
  return "Something went wrong while building the challenge. Please try again.";
}
