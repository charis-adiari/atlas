import {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios';
import { vi } from 'vitest';
import {
  CSRF_HEADER,
  CSRF_INVALID_CODE,
  CSRF_PATH,
  httpClient,
  resetCsrfToken
} from '@/lib/api/httpClient';

export const TEST_CSRF_TOKEN = 'test-csrf-token';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Represents a request as the test handler sees it.
 */
export interface MockRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  timeout: number | undefined;
}

/**
 * Represents the answer a test handler gives.
 */
export interface MockReply {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

export type HttpHandler = (request: MockRequest) => MockReply | Promise<MockReply>;

/**
 * Builds a JSON reply.
 */
export function jsonReply(
  status: number,
  data?: unknown,
  headers?: Record<string, string>
): MockReply {
  return { status, data, headers };
}

/**
 * Builds an error reply in the API's problem-details format.
 */
export function problemReply(
  status: number,
  detail: string,
  errors?: Record<string, string>,
  code?: string
): MockReply {
  return { status, data: { statusCode: status, title: 'Problem', detail, errors, code } };
}

/**
 * Replaces the transport of the shared Axios client for a test, so requests never touch the network. It answers the
 * CSRF token request itself and refuses state-changing requests that lack the right token, as the real server does, so a
 * test fails if the client forgets the header. Everything else goes to the handler; a handler that throws counts as a
 * lost connection.
 */
export class HttpMock {
  readonly handler = vi.fn<HttpHandler>();
  expectedCsrfToken = TEST_CSRF_TOKEN;
  csrfRequestCount = 0;
  readonly attemptedPaths: string[] = [];

  private originalAdapter = httpClient.defaults.adapter;
  private isNetworkDown = false;

  /**
   * Routes the shared client through this mock.
   */
  install(): void {
    this.originalAdapter = httpClient.defaults.adapter;
    httpClient.defaults.adapter = this.adapter;
    resetCsrfToken();
  }

  /**
   * Restores the real transport and forgets everything recorded.
   */
  uninstall(): void {
    httpClient.defaults.adapter = this.originalAdapter;
    this.handler.mockReset();
    this.csrfRequestCount = 0;
    this.attemptedPaths.length = 0;
    this.expectedCsrfToken = TEST_CSRF_TOKEN;
    this.isNetworkDown = false;
    resetCsrfToken();
  }

  /**
   * Cuts or restores the network for every request, including the CSRF token request.
   */
  setNetworkDown(isDown: boolean): void {
    this.isNetworkDown = isDown;
  }

  /**
   * Answers one request.
   */
  private readonly adapter: AxiosAdapter = async (config) => {
    this.attemptedPaths.push((config.url ?? '').split('?')[0]);
    if (this.isNetworkDown) {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
    const request = toMockRequest(config);

    if (request.method === 'GET' && request.path === CSRF_PATH) {
      this.csrfRequestCount += 1;
      return settle(config, jsonReply(200, { csrfToken: this.expectedCsrfToken }));
    }
    if (
      !SAFE_METHODS.includes(request.method) &&
      request.headers[CSRF_HEADER.toLowerCase()] !== this.expectedCsrfToken
    ) {
      return settle(
        config,
        problemReply(403, 'The request could not be verified.', undefined, CSRF_INVALID_CODE)
      );
    }
    try {
      return settle(config, await this.handler(request));
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error;
      }
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
  };
}

/**
 * Describes an Axios request the way a handler wants to read it.
 */
function toMockRequest(config: InternalAxiosRequestConfig): MockRequest {
  const headers = Object.fromEntries(
    Object.entries(config.headers.toJSON()).map(([name, value]) => [
      name.toLowerCase(),
      String(value)
    ])
  );
  return {
    method: (config.method ?? 'get').toUpperCase(),
    path: (config.url ?? '').split('?')[0],
    headers,
    body: typeof config.data === 'string' ? (JSON.parse(config.data) as unknown) : config.data,
    timeout: config.timeout
  };
}

/**
 * Turns a reply into a resolved response, or into the error Axios would raise for a failure status.
 */
function settle(config: InternalAxiosRequestConfig, reply: MockReply): AxiosResponse {
  const response: AxiosResponse = {
    data: reply.data,
    status: reply.status,
    statusText: '',
    headers: reply.headers ?? {},
    config,
    request: {}
  };
  if (reply.status >= 200 && reply.status < 300) {
    return response;
  }
  const code = reply.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
  throw new AxiosError(
    `Request failed with status code ${reply.status}`,
    code,
    config,
    {},
    response
  );
}
