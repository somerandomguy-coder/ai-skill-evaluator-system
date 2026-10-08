/**
 * Durable operation tracking for Generation (M08) and Evaluation (B04).
 *
 * Implements:
 *  - Owner-scoped idempotency key: hash of (type, ownerId, payloadDigest).
 *  - Prevents cross-owner draft disclosure (Row D03).
 *  - Preserves validated generated drafts so DB write failures do not trigger re-generation/re-billing.
 *  - Single-flight lease locks to deduplicate concurrent requests.
 */
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type OperationType = "GENERATION" | "EVALUATION";
export type OperationStatus = "PENDING" | "DISPATCHED" | "COMMITTED" | "FAILED";

export interface OperationRecord {
  id: string;
  type: OperationType;
  ownerId: string;
  inputDigest: string;
  status: OperationStatus;
  leaseExpiresAt: number;
  attemptCount: number;
  draftData?: any;
  resultId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface OperationsStore {
  operations: Record<string, OperationRecord>; // key: operationId
  byDigest: Record<string, string>; // key: `${type}:${ownerId}:${inputDigest}` -> operationId
}

export function computeInputDigest(payload: unknown): string {
  const canonical = typeof payload === "string" ? payload.trim() : JSON.stringify(payload);
  return createHash("sha256").update(canonical).digest("hex");
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export class OperationRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), ".cache", "proofcraft-operations.json");
    this.ensureStore();
  }

  private ensureStore(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // ignore
      }
    }
    if (!fs.existsSync(this.filePath)) {
      const initial: OperationsStore = { operations: {}, byDigest: {} };
      this.writeStore(initial);
    }
  }

  private readStore(): OperationsStore {
    this.ensureStore();
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf-8")) as OperationsStore;
    } catch {
      return { operations: {}, byDigest: {} };
    }
  }

  private writeStore(data: OperationsStore): void {
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, this.filePath);
  }

  public reset(): void {
    this.writeStore({ operations: {}, byDigest: {} });
  }

  /**
   * Claims an operation for a specific owner.
   * If an operation with this type and inputDigest already exists for this owner:
   *  - If COMMITTED: returns the existing resultId without re-running work.
   *  - If in-flight and lease valid: returns inFlight status to join the existing operation.
   *  - If FAILED with draft preserved: returns retryDraft so DB write can be retried without re-generating.
   */
  public claimOperation(
    type: OperationType,
    ownerId: string,
    payload: unknown,
    leaseDurationMs = 120_000
  ): {
    operation: OperationRecord;
    alreadyCompleted: boolean;
    inFlight: boolean;
    hasPreservedDraft: boolean;
  } {
    const store = this.readStore();
    const inputDigest = computeInputDigest(payload);
    const lookupKey = `${type}:${ownerId}:${inputDigest}`;
    const now = Date.now();

    const existingId = store.byDigest[lookupKey];
    if (existingId) {
      const existing = store.operations[existingId];
      if (existing) {
        // Must be the same owner (Row D03)
        if (existing.ownerId === ownerId) {
          if (existing.status === "COMMITTED" && existing.resultId) {
            return {
              operation: clone(existing),
              alreadyCompleted: true,
              inFlight: false,
              hasPreservedDraft: false,
            };
          }

          if (existing.status === "DISPATCHED" && existing.leaseExpiresAt > now) {
            return {
              operation: clone(existing),
              alreadyCompleted: false,
              inFlight: true,
              hasPreservedDraft: false,
            };
          }

          if (existing.draftData) {
            // Re-claim with extended lease for retry
            existing.attemptCount += 1;
            existing.leaseExpiresAt = now + leaseDurationMs;
            existing.status = "DISPATCHED";
            existing.updatedAt = new Date().toISOString();
            this.writeStore(store);
            return {
              operation: clone(existing),
              alreadyCompleted: false,
              inFlight: false,
              hasPreservedDraft: true,
            };
          }
        }
      }
    }

    // Create a new operation
    const opId = `op_${randomUUID()}`;
    const newOp: OperationRecord = {
      id: opId,
      type,
      ownerId,
      inputDigest,
      status: "DISPATCHED",
      leaseExpiresAt: now + leaseDurationMs,
      attemptCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.operations[opId] = newOp;
    store.byDigest[lookupKey] = opId;
    this.writeStore(store);

    return {
      operation: clone(newOp),
      alreadyCompleted: false,
      inFlight: false,
      hasPreservedDraft: false,
    };
  }

  /**
   * Preserves a validated draft under the operation record.
   * If a subsequent DB write fails, this draft can be retried without re-generating.
   */
  public preserveDraft(operationId: string, ownerId: string, draftData: any): void {
    const store = this.readStore();
    const op = store.operations[operationId];
    if (!op || op.ownerId !== ownerId) return;

    op.draftData = clone(draftData);
    op.updatedAt = new Date().toISOString();
    this.writeStore(store);
  }

  /**
   * Marks an operation as successfully committed with a result ID.
   */
  public completeOperation(operationId: string, ownerId: string, resultId: string): void {
    const store = this.readStore();
    const op = store.operations[operationId];
    if (!op || op.ownerId !== ownerId) return;

    op.status = "COMMITTED";
    op.resultId = resultId;
    op.updatedAt = new Date().toISOString();
    this.writeStore(store);
  }

  /**
   * Marks an operation as failed with an error message while preserving any draft.
   */
  public failOperation(operationId: string, ownerId: string, errorMessage: string): void {
    const store = this.readStore();
    const op = store.operations[operationId];
    if (!op || op.ownerId !== ownerId) return;

    op.status = "FAILED";
    op.error = errorMessage;
    op.updatedAt = new Date().toISOString();
    this.writeStore(store);
  }

  /**
   * Gets an operation by ID, enforcing that only the owning user can retrieve it.
   */
  public getOperation(operationId: string, requestingOwnerId: string): OperationRecord | null {
    const store = this.readStore();
    const op = store.operations[operationId];
    if (!op) return null;
    if (op.ownerId !== requestingOwnerId) return null; // Row D03: other owner cannot receive private draft
    return clone(op);
  }
}

export const operationRepo = new OperationRepository();
