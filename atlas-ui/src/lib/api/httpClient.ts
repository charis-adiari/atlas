import axios, { type AxiosError } from 'axios';
import type { ApiProblemDetail } from '@/types/api';
import { ApiError, type ApiErrorDetails } from './apiError';

declare module 'axios' {
  interface AxiosRequestConfig {
    canExpireSession?: boolean;
    hasRetriedCsrf?: boolean;
  }
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
export const NETWORK_ERROR_STATUS = 0;
export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";
export const UNKNOWN_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const PAYLOAD_TOO_LARGE_MESSAGE = 'The data is too large to upload in one go.';
export const CSRF_HEADER = 'X-CSRF-Token';
export const CSRF_PATH = '/auth/csrf';
export const CSRF_INVALID_CODE = 'csrf_invalid';

const DEFAULT_TIMEOUT_MS = 30_000;
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const SAFE_METHODS = ['get', 'head', 'options'];

let csrfToken: string | null = null;
let pendingCsrfToken: Promise<string> | null = null;
let unauthorizedHandler: (() => void) | null = null;

/**
 * The one Axios instance every request to the API goes through. It talks to this app's own server, which keeps the
 * access token in an HttpOnly cookie and adds it to the upstream call, so no token is handled here. Requests that
 * change data carry a CSRF token. Every failure is rethrown as an ApiError.
 */
export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' }
});

httpClient.interceptors.request.use(async (config) => {
  if (!SAFE_METHODS.includes((config.method ?? 'get').toLowerCase())) {
    config.headers.set(CSRF_HEADER, await getCsrfToken());
  }
  return config;
});

httpClient.interceptors.response.use(undefined, async (error: unknown) => {
  const apiError = toApiError(error);
  const config = axios.isAxiosError(error) ? error.config : undefined;

  if (config !== undefined && isCsrfRejection(apiError) && config.hasRetriedCsrf !== true) {
    resetCsrfToken();
    return httpClient.request({ ...config, hasRetriedCsrf: true });
  }
  if (apiError.statusCode === UNAUTHORIZED_STATUS && config?.canExpireSession !== false) {
    unauthorizedHandler?.();
  }
  throw apiError;
});

/**
 * Registers what to do when the server says the session is no longer valid, for example because its cookie expired.
 * Requests marked with canExpireSession: false, such as asking whether a session exists, do not trigger it.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/**
 * Forgets the CSRF token so the next change to data asks the server for a fresh one, which is needed whenever the
 * session changes.
 */
export function resetCsrfToken(): void {
  csrfToken = null;
  pendingCsrfToken = null;
}

/**
 * Converts anything thrown while calling the API into an ApiError. An answer from the server keeps its status and
 * problem details; anything without an answer, including a timeout, counts as a lost connection.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error) && error.response !== undefined) {
    return fromResponse(error);
  }
  const details = axios.isAxiosError(error) ? describeRequest(error) : {};
  return new ApiError(NETWORK_ERROR_STATUS, NETWORK_ERROR_MESSAGE, {}, details);
}

/**
 * Gets the CSRF token for this page, asking the server for one the first time.
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) {
    return csrfToken;
  }
  pendingCsrfToken ??= requestCsrfToken();
  return pendingCsrfToken;
}

/**
 * Asks the server for a CSRF token and remembers it.
 */
async function requestCsrfToken(): Promise<string> {
  try {
    const response = await httpClient.get<{ csrfToken?: unknown }>(CSRF_PATH, {
      canExpireSession: false
    });
    const token = response.data?.csrfToken;

    if (typeof token !== 'string' || token === '') {
      throw new ApiError(response.status, UNKNOWN_ERROR_MESSAGE);
    }
    csrfToken = token;
    return token;
  } finally {
    pendingCsrfToken = null;
  }
}

/**
 * Checks whether the server refused a request because its CSRF token was missing or no longer matched.
 */
function isCsrfRejection(error: ApiError): boolean {
  return error.statusCode === FORBIDDEN_STATUS && error.details.code === CSRF_INVALID_CODE;
}

/**
 * Builds an ApiError from an error response, using the problem details body when there is a readable one.
 */
function fromResponse(error: AxiosError): ApiError {
  const status = error.response?.status ?? NETWORK_ERROR_STATUS;
  const problem = isRecord(error.response?.data)
    ? (error.response.data as Partial<ApiProblemDetail> & { code?: unknown })
    : null;
  const detail = typeof problem?.detail === 'string' && problem.detail ? problem.detail : null;
  const details: ApiErrorDetails = {
    ...describeRequest(error),
    code: typeof problem?.code === 'string' ? problem.code : undefined,
    correlationId: readHeader(error, 'x-correlation-id')
  };

  return new ApiError(
    status,
    detail ?? fallbackMessageFor(status),
    readFieldErrors(problem),
    details
  );
}

/**
 * Names the request that failed, without its body.
 */
function describeRequest(error: AxiosError): ApiErrorDetails {
  return { method: error.config?.method?.toUpperCase(), path: error.config?.url };
}

/**
 * Reads a response header as text, if the server sent it.
 */
function readHeader(error: AxiosError, name: string): string | undefined {
  const value: unknown = error.response?.headers?.[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Gets the message for an error response that did not carry one of its own.
 */
function fallbackMessageFor(status: number): string {
  return status === PAYLOAD_TOO_LARGE_STATUS ? PAYLOAD_TOO_LARGE_MESSAGE : UNKNOWN_ERROR_MESSAGE;
}

/**
 * Keeps only the string messages from the per-field errors of a problem.
 */
function readFieldErrors(problem: Partial<ApiProblemDetail> | null): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const errors: unknown = problem?.errors;

  if (isRecord(errors)) {
    for (const [field, message] of Object.entries(errors)) {
      if (typeof message === 'string') {
        fieldErrors[field] = message;
      }
    }
  }
  return fieldErrors;
}

/**
 * Checks that a value is a plain object rather than null, a list or a primitive.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
