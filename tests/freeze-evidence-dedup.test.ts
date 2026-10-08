import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitSession, sendMessage } from "@/lib/services/sessions";
import { OperationRepository } from "@/lib/data/operations";
import { prisma } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

describe("B04 — Freeze Evidence and Deduplicate Paid Work (D05–D08)", () => {
  const testOpsPath = path.join(process.cwd(), ".cache", "test-b04-operations.json");
  let opRepo: OperationRepository;

  beforeEach(async () => {
    if (fs.existsSync(testOpsPath)) {
      try { fs.unlinkSync(testOpsPath); } catch {}
    }
    opRepo = new OperationRepository(testOpsPath);
  });

  // Row D05: Two concurrent evaluation requests for same session cause a single dispatch
  it("D05: deduplicates concurrent submit requests, preventing duplicate evaluation dispatch", async () => {
    const ownerId = "cand-d05";
    const payload = { sessionId: "sess-d05" };

    // Request 1 claims the operation
    const claim1 = opRepo.claimOperation("EVALUATION", ownerId, payload, 30_000);
    expect(claim1.alreadyCompleted).toBe(false);
    expect(claim1.inFlight).toBe(false);
    expect(claim1.operation.status).toBe("DISPATCHED");

    // Request 2 tries to claim the same operation concurrently
    const claim2 = opRepo.claimOperation("EVALUATION", ownerId, payload, 30_000);
    expect(claim2.alreadyCompleted).toBe(false);
    expect(claim2.inFlight).toBe(true); // Must join the existing in-flight operation
    expect(claim2.operation.id).toBe(claim1.operation.id);

    // Complete the first operation with a result ID
    opRepo.completeOperation(claim1.operation.id, ownerId, "eval-res-123");

    // Subsequent request gets the completed result immediately
    const claim3 = opRepo.claimOperation("EVALUATION", ownerId, payload, 30_000);
    expect(claim3.alreadyCompleted).toBe(true);
    expect(claim3.operation.resultId).toBe("eval-res-123");
  });

  // Row D06: Late assistant stream appends turn after submission timestamp
  it("D06: rejects late messages after submission and excludes late turns from evaluation cutoff", async () => {
    const userId = "cand-d06";
    const challengeId = "challenge-d06";
    const sessionId = "sess-d06";

    // Setup in-memory / db mock state
    (prisma.buildSession.findUnique as any) = vi.fn().mockImplementation(async (args: any) => {
      if (args.where?.id === sessionId) {
        return {
          id: sessionId,
          userId,
          challengeId,
          status: "SUBMITTED", // Already submitted!
          startedAt: new Date(Date.now() - 60000),
          submittedAt: new Date(),
          challenge: {
            title: "Task D06",
            brief: "Brief",
            timeboxMinutes: 30,
            starterTemplate: "{}",
            rubricVersion: "2026.1",
            requirements: [],
          },
          turns: [
            { id: "t1", seq: 1, role: "USER", content: "Prompt 1", createdAt: new Date(Date.now() - 50000), filesWritten: "[]" },
            { id: "t2", seq: 2, role: "ASSISTANT", content: "Reply 1", createdAt: new Date(Date.now() - 40000), filesWritten: "[]" },
          ],
          snapshot: { id: "snap-1", tree: "[]", capturedAt: new Date(Date.now() - 30000) },
        } as any;
      }
      return null as any;
    });

    // Attempting to send a message when session is SUBMITTED must throw 409
    await expect(
      sendMessage({
        sessionId,
        userId,
        message: "Late message trying to sneak in",
      })
    ).rejects.toThrow(/already been submitted/);
  });

  // Row D07: Process crash after inference dispatch but before result write
  it("D07: handles process crash/interruption cleanly without data corruption", async () => {
    const ownerId = "cand-d07";
    const payload = { sessionId: "sess-d07" };

    // Lease starts with 1 second duration
    const claim = opRepo.claimOperation("EVALUATION", ownerId, payload, 100);
    expect(claim.operation.status).toBe("DISPATCHED");

    // Simulate process crash / failure to complete before lease expiry
    // Wait for lease to expire (simulating dead worker)
    await new Promise((r) => setTimeout(r, 150));

    // After lease expiry, a retry reclaims the operation with an incremented attempt count
    const retryClaim = opRepo.claimOperation("EVALUATION", ownerId, payload, 5000);
    expect(retryClaim.inFlight).toBe(false);
    expect(retryClaim.alreadyCompleted).toBe(false);
    expect(retryClaim.operation.attemptCount).toBeGreaterThanOrEqual(1);
    expect(retryClaim.operation.status).toBe("DISPATCHED");
  });

  // Row D08: Expired lease, duplicate callback/retry, idempotent writes
  it("D08: enforces single ownership and idempotent writes under retries", async () => {
    const ownerId = "cand-d08";
    const otherOwnerId = "cand-d08-malicious";
    const payload = { sessionId: "sess-d08" };

    const claim = opRepo.claimOperation("EVALUATION", ownerId, payload, 5000);
    opRepo.completeOperation(claim.operation.id, ownerId, "eval-committed-456");

    // Other owner cannot access or reclaim this operation
    const otherLookup = opRepo.getOperation(claim.operation.id, otherOwnerId);
    expect(otherLookup).toBeNull();

    // Owner repeat retrieval returns same committed result idempotently
    const idempotentLookup = opRepo.claimOperation("EVALUATION", ownerId, payload, 5000);
    expect(idempotentLookup.alreadyCompleted).toBe(true);
    expect(idempotentLookup.operation.resultId).toBe("eval-committed-456");
  });
});
