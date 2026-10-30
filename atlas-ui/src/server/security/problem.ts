import { NextResponse } from 'next/server';

export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  413: 'Payload Too Large',
  502: 'Bad Gateway'
};

/**
 * Builds an error response in the same problem-details format the API uses, so the browser handles errors from this
 * server and from the API the same way.
 *
 * @param status the HTTP status
 * @param detail what went wrong, in words that are safe to log
 * @param code an optional machine-readable reason, such as csrf_invalid
 */
export function problemResponse(status: number, detail: string, code?: string): NextResponse {
  return NextResponse.json(
    { statusCode: status, title: TITLES[status] ?? 'Error', detail, code },
    { status, headers: { ...NO_STORE_HEADERS, 'Content-Type': 'application/problem+json' } }
  );
}
