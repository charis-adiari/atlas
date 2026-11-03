/**
 * Represents technical facts about a failed request, kept for logs and never shown to the user.
 */
export interface ApiErrorDetails {
  code?: string;
  method?: string;
  path?: string;
  correlationId?: string;
}

/**
 * Signals that a request did not succeed. A status code of zero means the server could not be reached. The message is
 * the server's own wording and is meant for logs; what the user sees is decided by the caller.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly fieldErrors: Record<string, string>;
  readonly details: ApiErrorDetails;

  constructor(
    statusCode: number,
    message: string,
    fieldErrors: Record<string, string> = {},
    details: ApiErrorDetails = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
    this.details = details;
  }
}
