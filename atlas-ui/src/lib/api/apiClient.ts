import type { ApiProblemDetail } from '@/types/api';
import { ApiError } from './ApiError';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
export const NETWORK_ERROR_STATUS = 0;
export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";
export const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const PAYLOAD_TOO_LARGE_MESSAGE = 'The data is too large to upload in one go.';
export const PAYLOAD_TOO_LARGE_STATUS = 413;

const JSON_CONTENT_TYPE = 'application/json';

/**
 * Represents the optional parts of a request.
 */
export interface PostJsonOptions {
  authorization?: string;
  timeoutMs?: number;
}

/**
 * Sends a JSON body to the API and returns the parsed JSON response.
 *
 * @param path path relative to the API base URL, starting with a slash
 * @param body value serialised as the request body
 * @param options an Authorization header value for protected endpoints, and a time after which the request is
 * given up on and reported as a network failure
 * @throws ApiError if the server cannot be reached or answers with a non-2xx status
 */
export async function postJson<TResponse>(
  path: string,
  body: unknown,
  options: PostJsonOptions = {}
): Promise<TResponse> {
  const response = await send(path, body, options);

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as TResponse;
}

/**
 * Performs the POST, turning a failure to reach the server into an ApiError.
 */
async function send(path: string, body: unknown, options: PostJsonOptions): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': JSON_CONTENT_TYPE,
    Accept: JSON_CONTENT_TYPE
  };
  if (options.authorization !== undefined) {
    headers.Authorization = options.authorization;
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: options.timeoutMs === undefined ? undefined : AbortSignal.timeout(options.timeoutMs)
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS, NETWORK_ERROR_MESSAGE);
  }
}

/**
 * Builds an ApiError from an error response, using the problem details body when there is a readable one.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const problem = await readProblem(response);
  const detail = typeof problem?.detail === 'string' && problem.detail ? problem.detail : null;
  const message = detail ?? fallbackMessageFor(response.status);

  return new ApiError(response.status, message, readFieldErrors(problem));
}

/**
 * Gets the message for an error response that did not carry one of its own.
 */
function fallbackMessageFor(status: number): string {
  return status === PAYLOAD_TOO_LARGE_STATUS ? PAYLOAD_TOO_LARGE_MESSAGE : UNKNOWN_ERROR_MESSAGE;
}

/**
 * Reads the response body as problem details, or null if it is not JSON.
 */
async function readProblem(response: Response): Promise<Partial<ApiProblemDetail> | null> {
  try {
    return (await response.json()) as Partial<ApiProblemDetail> | null;
  } catch {
    return null;
  }
}

/**
 * Keeps only the string messages from the per-field errors of a problem.
 */
function readFieldErrors(problem: Partial<ApiProblemDetail> | null): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const errors: unknown = problem?.errors;

  if (typeof errors === 'object' && errors !== null) {
    for (const [field, message] of Object.entries(errors)) {
      if (typeof message === 'string') {
        fieldErrors[field] = message;
      }
    }
  }

  return fieldErrors;
}
