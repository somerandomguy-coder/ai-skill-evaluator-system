/** An error whose message is safe to show a user, carrying the HTTP status a route should return. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    /** True when the caller can safely re-send the same request (e.g. an unanswered message is on record). */
    readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * A failure that happened AFTER the candidate's message was saved. The message is
 * on record, so retrying re-runs the assistant without sending it twice.
 */
export class RetryableError extends Error {
  constructor(readonly original: unknown) {
    super(original instanceof Error ? original.message : "The assistant hit a problem.");
    this.name = "RetryableError";
  }
}
