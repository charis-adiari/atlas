import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './ApiError';
import {
  NETWORK_ERROR_MESSAGE,
  NETWORK_ERROR_STATUS,
  PAYLOAD_TOO_LARGE_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  postJson
} from './apiClient';
import { signup } from './authApi';
import { MIGRATION_TIMEOUT_MS, migrateVaults } from './migrationApi';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Expected the promise to reject');
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('postJson', () => {
  it('posts the body as JSON to the API and returns the parsed response', async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }, 201));

    // Act
    const result = await postJson<{ ok: boolean }>('/things', { name: 'a' });

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/things');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"name":"a"}');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(result).toEqual({ ok: true });
  });

  it('throws an ApiError carrying the status, detail and per-field errors', async () => {
    // Arrange
    const problem = {
      statusCode: 400,
      title: 'Bad Request',
      detail: 'The request is invalid.',
      errors: { password: 'Password is required', ignored: 42 }
    };
    fetchMock.mockResolvedValue(jsonResponse(problem, 400));

    // Act
    const error = await catchError(postJson('/things', {}));

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('The request is invalid.');
    expect(error.fieldErrors).toEqual({ password: 'Password is required' });
  });

  it('throws a generic ApiError when the error body is not JSON', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

    // Act
    const error = await catchError(postJson('/things', {}));

    // Assert
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(error.fieldErrors).toEqual({});
  });

  it('throws a generic ApiError when the error body has no usable detail', async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(null, 500));

    // Act
    const error = await catchError(postJson('/things', {}));

    // Assert
    expect(error.message).toBe(UNKNOWN_ERROR_MESSAGE);
  });

  it('throws a network ApiError when the server cannot be reached', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    const error = await catchError(postJson('/things', {}));

    // Assert
    expect(error.statusCode).toBe(NETWORK_ERROR_STATUS);
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });
});

describe('signup', () => {
  it('posts the credentials to the signup endpoint', async () => {
    // Arrange
    const response = {
      user: { id: '1', email: 'you@example.com' },
      accessToken: 'jwt',
      tokenType: 'Bearer',
      expiresIn: 3600
    };
    fetchMock.mockResolvedValue(jsonResponse(response, 201));

    // Act
    const result = await signup({ email: 'you@example.com', password: 'Passw0rd!' });

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/auth/signup');
    expect(init?.body).toBe('{"email":"you@example.com","password":"Passw0rd!"}');
    expect(result).toEqual(response);
  });
});

describe('postJson options', () => {
  it('sends the Authorization header when one is given', async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse({}, 200));

    // Act
    await postJson('/things', {}, { authorization: 'Bearer jwt' });

    // Assert
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer jwt' });
  });

  it('sends no Authorization header and no timeout by default', async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse({}, 200));

    // Act
    await postJson('/things', {});

    // Assert
    const init = fetchMock.mock.calls[0][1];
    expect(init?.headers).not.toHaveProperty('Authorization');
    expect(init?.signal).toBeUndefined();
  });

  it('gives up on a request that takes longer than the timeout and reports a network failure', async () => {
    // Arrange
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Timed out', 'TimeoutError'))
          );
        })
    );

    // Act
    const error = await catchError(postJson('/things', {}, { timeoutMs: 20 }));

    // Assert
    expect(error.statusCode).toBe(NETWORK_ERROR_STATUS);
  });

  it('explains a 413 that carries no message of its own', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('', { status: 413 }));

    // Act
    const error = await catchError(postJson('/things', {}));

    // Assert
    expect(error.message).toBe(PAYLOAD_TOO_LARGE_MESSAGE);
  });
});

describe('migrateVaults', () => {
  it('posts the payload to the migrate endpoint as the signed-in user, with a timeout', async () => {
    // Arrange
    const payload = { vaults: [], folders: [], files: [], backlinks: [] };
    fetchMock.mockResolvedValue(
      jsonResponse({ vaults: 0, folders: 0, files: 0, backlinks: 0 }, 201)
    );

    // Act
    await migrateVaults(payload, { accessToken: 'jwt', tokenType: 'Bearer' });

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/vaults/migrate');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer jwt' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(MIGRATION_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
