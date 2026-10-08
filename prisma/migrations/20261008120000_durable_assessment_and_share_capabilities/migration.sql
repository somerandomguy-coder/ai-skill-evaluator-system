-- Bring the migration history up to the schema already used by the application,
-- then persist employer share grants instead of keeping them in process memory.
-- IF NOT EXISTS makes this safe for prototype databases that received these
-- columns through an earlier manual db push; fresh Prisma deployments receive
-- the same final schema.

ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Challenge" ADD COLUMN IF NOT EXISTS "contentDigest" TEXT;
ALTER TABLE "BuildSession" ADD COLUMN IF NOT EXISTS "challengeVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Evaluation" ADD COLUMN IF NOT EXISTS "assessmentEnvelope" JSONB;

DO $$ BEGIN
  CREATE TYPE "ChallengeAuditDecision" AS ENUM ('APPROVED', 'RE_CALIBRATE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ChallengeAudit" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "contentDigest" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "decision" "ChallengeAuditDecision" NOT NULL,
  "totalScore" INTEGER NOT NULL,
  "scores" JSONB NOT NULL,
  "notes" TEXT,
  "reasons" TEXT[],
  "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChallengeAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChallengeAudit_challengeId_version_idx" ON "ChallengeAudit"("challengeId", "version");
CREATE INDEX IF NOT EXISTS "ChallengeAudit_mentorId_idx" ON "ChallengeAudit"("mentorId");

DO $$ BEGIN
  ALTER TABLE "ChallengeAudit" ADD CONSTRAINT "ChallengeAudit_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeAudit" ADD CONSTRAINT "ChallengeAudit_mentorId_fkey"
    FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ShareCapability" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'EMPLOYER_VIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "versionRef" TEXT NOT NULL DEFAULT 'v1',
  CONSTRAINT "ShareCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShareCapability_tokenHash_key" ON "ShareCapability"("tokenHash");
CREATE INDEX IF NOT EXISTS "ShareCapability_evaluationId_idx" ON "ShareCapability"("evaluationId");
CREATE INDEX IF NOT EXISTS "ShareCapability_ownerId_idx" ON "ShareCapability"("ownerId");

DO $$ BEGIN
  ALTER TABLE "ShareCapability" ADD CONSTRAINT "ShareCapability_evaluationId_fkey"
    FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
