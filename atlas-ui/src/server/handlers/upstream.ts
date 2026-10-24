import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { NextResponse } from 'next/server';
import { getApiOrigin } from '@/server/config';
import { NO_STORE_HEADERS } from '@/server/security/problem';

export const UPSTREAM_TIMEOUT_MS = 65_000;

const BODYLESS_STATUSES = [204, 205, 304];

/**
 * The Axios instance for calls from this server to the Atlas API. It never throws for an HTTP error status, so the
 * answer can be passed on as it is, and it does not follow redirects.
 */
export const upstreamClient = axios.create({
  timeout: UPSTREAM_TIMEOUT_MS,
  maxRedirects: 0,
  validateStatus: () => true,
  responseType: 'text',
  transformResponse: [(data: unknown) => data]
});

/**
 * Builds the URL of an API path.
 */
export function upstreamUrl(path: string): string {
  return `${getApiOrigin()}/api/v1${path}`;
}

/**
 * Calls the API. If it cannot be reached the technical reason is logged on the server and null is returned, so the caller
 * can answer with a generic error instead of exposing it.
 */
export async function callUpstream(
  config: AxiosRequestConfig
): Promise<AxiosResponse<string> | null> {
  try {
    return await upstreamClient.request<string>(config);
  } catch (error) {
    const reason = axios.isAxiosError(error) ? (error.code ?? error.message) : String(error);
    console.error('[atlas-server] upstream call failed', { url: config.url, reason });
    return null;
  }
}

/**
 * Passes the API's answer on to the browser unchanged apart from the headers that matter: content type and correlation
 * id. Nothing is cached.
 */
export function forwardResponse(upstream: AxiosResponse<string>): NextResponse {
  const headers = new Headers(NO_STORE_HEADERS);
  const contentType: unknown = upstream.headers['content-type'];
  const correlationId: unknown = upstream.headers['x-correlation-id'];

  if (typeof contentType === 'string') {
    headers.set('Content-Type', contentType);
  }
  if (typeof correlationId === 'string') {
    headers.set('X-Correlation-Id', correlationId);
  }
  const body = BODYLESS_STATUSES.includes(upstream.status) ? null : upstream.data;
  return new NextResponse(body, { status: upstream.status, headers });
}
