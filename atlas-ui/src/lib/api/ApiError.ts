/**
 * Signals that a request did not succeed. A status code of zero means the server could not be reached.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors: Record<string, string>;

  constructor(statusCode: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}
