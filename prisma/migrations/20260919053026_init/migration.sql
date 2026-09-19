-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'MENTOR');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "TurnRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'PENDING', 'REVIEWED');

-- CreateEnum
CREATE TYPE "MentorVerdict" AS ENUM ('CONFIRM', 'OVERRIDE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawJd" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "parsedJd" JSONB NOT NULL,
    "companyResearch" JSONB NOT NULL,
    "fromDemoCache" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "jobSubmissionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "domainContext" TEXT NOT NULL,
    "timeboxMinutes" INTEGER NOT NULL,
    "starterTemplate" JSONB NOT NULL,
    "rubricVersion" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "successSignals" TEXT[],
    "failureModes" TEXT[],

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildSession" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "BuildSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatTurn" (
    "id" TEXT NOT NULL,
    "buildSessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" "TurnRole" NOT NULL,
    "content" TEXT NOT NULL,
    "filesWritten" JSONB,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileSnapshot" (
    "id" TEXT NOT NULL,
    "buildSessionId" TEXT NOT NULL,
    "tree" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "buildSessionId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "perRequirement" JSONB NOT NULL,
    "strengths" TEXT[],
    "gaps" TEXT[],
    "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "rubricVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NONE',
    "contested" BOOLEAN NOT NULL DEFAULT false,
    "contestReason" TEXT,
    "contestedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'ai',

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorReview" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "verdict" "MentorVerdict" NOT NULL,
    "comments" TEXT NOT NULL,
    "adjustedScore" DOUBLE PRECISION,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCache" (
    "id" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "failed" BOOLEAN NOT NULL DEFAULT false,
    "retryAfter" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "JobSubmission_userId_idx" ON "JobSubmission"("userId");

-- CreateIndex
CREATE INDEX "Challenge_jobSubmissionId_idx" ON "Challenge"("jobSubmissionId");

-- CreateIndex
CREATE INDEX "Requirement_challengeId_idx" ON "Requirement"("challengeId");

-- CreateIndex
CREATE INDEX "BuildSession_challengeId_idx" ON "BuildSession"("challengeId");

-- CreateIndex
CREATE INDEX "BuildSession_userId_idx" ON "BuildSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatTurn_buildSessionId_seq_key" ON "ChatTurn"("buildSessionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "FileSnapshot_buildSessionId_key" ON "FileSnapshot"("buildSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_buildSessionId_key" ON "Evaluation"("buildSessionId");

-- CreateIndex
CREATE INDEX "Evaluation_reviewStatus_idx" ON "Evaluation"("reviewStatus");

-- CreateIndex
CREATE INDEX "MentorReview_evaluationId_idx" ON "MentorReview"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCache_queryHash_key" ON "SearchCache"("queryHash");

-- AddForeignKey
ALTER TABLE "JobSubmission" ADD CONSTRAINT "JobSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_jobSubmissionId_fkey" FOREIGN KEY ("jobSubmissionId") REFERENCES "JobSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildSession" ADD CONSTRAINT "BuildSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildSession" ADD CONSTRAINT "BuildSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatTurn" ADD CONSTRAINT "ChatTurn_buildSessionId_fkey" FOREIGN KEY ("buildSessionId") REFERENCES "BuildSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSnapshot" ADD CONSTRAINT "FileSnapshot_buildSessionId_fkey" FOREIGN KEY ("buildSessionId") REFERENCES "BuildSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_buildSessionId_fkey" FOREIGN KEY ("buildSessionId") REFERENCES "BuildSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorReview" ADD CONSTRAINT "MentorReview_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
