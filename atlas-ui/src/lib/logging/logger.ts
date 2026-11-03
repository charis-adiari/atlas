import { ApiError } from '@/lib/api/apiError';

const MAX_TEXT_LENGTH = 300;

/**
 * Represents one logged error: what failed and where, with the technical facts a developer needs. It never holds a
 * request body, a password or a token.
 */
export interface ErrorLogEntry {
  context: string;
  name: string;
  message: string;
  statusCode?: number;
  code?: string;
  method?: string;
  path?: string;
  correlationId?: string;
  loggedAt: string;
}

export type ErrorLogSink = (entry: ErrorLogEntry) => void;

let sink: ErrorLogSink = writeToConsole;

/**
 * Replaces where error logs go, for example to send them to a monitoring service. Passing null restores the console.
 */
export function setErrorLogSink(next: ErrorLogSink | null): void {
  sink = next ?? writeToConsole;
}

/**
 * Records the technical details of an error the user was not shown, so they are available for debugging while the
 * user only sees a generic message.
 *
 * @param context where it happened, such as "signup" or "migration"
 * @param error whatever was thrown
 * @param request the request that failed, when the error came from calling the API
 */
export function logUnexpectedError(
  context: string,
  error: unknown,
  request?: Pick<ErrorLogEntry, 'method' | 'path'>
): void {
  sink({ ...describeError(error), ...request, context, loggedAt: new Date().toISOString() });
}

/**
 * Picks the loggable facts out of an error.
 */
function describeError(error: unknown): Omit<ErrorLogEntry, 'context' | 'loggedAt'> {
  if (error instanceof ApiError) {
    return {
      name: error.name,
      message: truncate(error.message),
      statusCode: error.statusCode,
      ...error.details
    };
  }
  if (error instanceof Error) {
    return { name: error.name, message: truncate(error.message) };
  }
  return { name: 'UnknownError', message: truncate(String(error)) };
}

/**
 * Cuts text to a length that is safe to log.
 */
function truncate(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;
}

/**
 * Writes an entry to the console, which is where logs go until a sink is set: the browser console on the page, and the
 * server log in the app server's route handlers.
 */
function writeToConsole(entry: ErrorLogEntry): void {
  console.error('[atlas]', entry);
}
