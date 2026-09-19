/** An error whose message is safe to show a user, carrying the HTTP status a route should return. */
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
