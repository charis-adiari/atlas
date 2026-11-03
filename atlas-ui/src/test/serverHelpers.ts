import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';
import { getCsrfCookieName } from '@/server/auth/authCookies';
import { upstreamClient } from '@/server/handlers/upstream';
import { generateCsrfToken } from '@/server/security/csrf';

export const APP_ORIGIN = 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: string;
}

/**
 * Builds an unsigned access token with the given claims, which is all the server reads. The expiry defaults to an hour
 * from now.
 */
export function makeJwt(claims: Record<string, unknown> = {}): string {
  const payload = {
    sub: 'user-1',
    email: 'jd@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims
  };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

/**
 * Builds a request to this app's server.
 */
export function createRequest(path: string, options: RequestOptions = {}): NextRequest {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);

  if (options.cookies !== undefined) {
    headers.set(
      'cookie',
      Object.entries(options.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
    );
  }
  const hasBody = !['GET', 'HEAD'].includes(method);
  return new NextRequest(`${APP_ORIGIN}${path}`, {
    method,
    headers,
    body: hasBody ? (options.body ?? '') : undefined
  });
}

/**
 * Builds a state-changing request that passes the CSRF check, as one sent by this app's own pages does: the same-site
 * origin, and the token in both the cookie and the header.
 */
export function createTrustedRequest(path: string, options: RequestOptions = {}): NextRequest {
  const token = generateCsrfToken();
  return createRequest(path, {
    method: 'POST',
    ...options,
    headers: { origin: APP_ORIGIN, 'x-csrf-token': token, ...options.headers },
    cookies: { [getCsrfCookieName()]: token, ...options.cookies }
  });
}

/**
 * Replaces the transport of the server's upstream Axios client for a test, so no call reaches a real API.
 */
export class UpstreamMock {
  readonly calls: AxiosRequestConfig[] = [];

  private original = upstreamClient.defaults.adapter;
  private next: () => Promise<AxiosResponse<string>> = () =>
    Promise.reject(new Error('No reply set'));

  /**
   * Routes the upstream client through this mock.
   */
  install(): void {
    this.original = upstreamClient.defaults.adapter;
    upstreamClient.defaults.adapter = async (config) => {
      this.calls.push(config);
      return this.next();
    };
  }

  /**
   * Restores the real transport.
   */
  uninstall(): void {
    upstreamClient.defaults.adapter = this.original;
    this.calls.length = 0;
  }

  /**
   * Makes the API answer every call with the given status and body.
   */
  reply(status: number, body: unknown, headers: Record<string, string> = {}): void {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    this.next = async () =>
      ({
        data,
        status,
        statusText: '',
        headers: { 'content-type': 'application/json', ...headers },
        config: {},
        request: {}
      }) as AxiosResponse<string>;
  }

  /**
   * Makes the API unreachable.
   */
  fail(): void {
    this.next = () => Promise.reject(new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED'));
  }

  /**
   * Gets the headers of the last call, with lower-case names.
   */
  lastHeaders(): Record<string, string> {
    const headers = this.calls.at(-1)?.headers ?? {};
    return Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [name.toLowerCase(), String(value)])
    );
  }
}

/**
 * Silences console.error for a test and returns the spy so the test can check what was logged.
 */
export function silenceServerLog() {
  return vi.spyOn(console, 'error').mockImplementation(() => undefined);
}
