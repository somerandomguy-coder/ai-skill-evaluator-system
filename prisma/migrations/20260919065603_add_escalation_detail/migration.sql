-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "escalationDetail" JSONB NOT NULL DEFAULT '[]';
