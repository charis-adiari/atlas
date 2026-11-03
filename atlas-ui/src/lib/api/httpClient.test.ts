import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpMock, TEST_CSRF_TOKEN, jsonReply, problemReply } from '@/test/HttpMock';
import { ApiError } from './apiError';
import { fetchSession, login, logout, signup } from './authApi';
import {
  NETWORK_ERROR_MESSAGE,
  NETWORK_ERROR_STATUS,
  PAYLOAD_TOO_LARGE_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  httpClient,
  setUnauthorizedHandler
} from './httpClient';
import {
  ALREADY_MIGRATED_MESSAGE,
  MIGRATION_TIMEOUT_MS,
  isAlreadyMigrated,
  migrateVaults
} from './migrationApi';

const http = new HttpMock();
const SESSION_BODY = { user: { id: 'u1', email: 'jd@example.com' }, expiresIn: 3600 };

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Expected the promise to reject');
}

beforeEach(() => {
  http.install();
});

afterEach(() => {
  http.uninstall();
  setUnauthorizedHandler(null);
});

describe('httpClient', () => {
  it("talks to this app's own server and sends cookies with each request", () => {
    // Arrange
    const defaults = httpClient.defaults;

    // Act
    const { baseURL, withCredentials } = defaults;

    // Assert
    expect(baseURL).toBe('/api/v1');
    expect(withCredentials).toBe(true);
  });

  it('posts JSON and never sends an Authorization header', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, {}));

    // Act
    await httpClient.post('/things', { name: 'a' });

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/things');
    expect(request.body).toEqual({ name: 'a' });
    expect(request.headers['content-type']).toContain('application/json');
    expect(request.headers).not.toHaveProperty('authorization');
  });

  it('asks for a CSRF token before the first state-changing request and reuses it afterwards', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, {}));

    // Act
    await httpClient.post('/things', {});
    await httpClient.delete('/things/1');

    // Assert
    expect(http.csrfRequestCount).toBe(1);
    expect(http.handler.mock.calls[0][0].headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
    expect(http.handler.mock.calls[1][0].headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
  });

  it('does not ask for a CSRF token for requests that only read', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonResponse200());

    // Act
    await httpClient.get('/things');

    // Assert
    expect(http.csrfRequestCount).toBe(0);
    expect(http.handler.mock.calls[0][0].headers).not.toHaveProperty('x-csrf-token');
  });

  it('fetches a fresh token and retries once when the server has rotated it', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { ok: true }));
    await httpClient.post('/things', {});
    http.expectedCsrfToken = 'rotated-token';

    // Act
    const response = await httpClient.post('/things', {});

    // Assert
    expect(response.data).toEqual({ ok: true });
    expect(http.csrfRequestCount).toBe(2);
    expect(http.handler.mock.calls[1][0].headers['x-csrf-token']).toBe('rotated-token');
    expect(http.handler).toHaveBeenCalledTimes(2);
  });

  it('turns an error response into an ApiError with the status, problem details and field errors', async () => {
    // Arrange
    http.handler.mockResolvedValue(
      jsonReply(
        400,
        {
          statusCode: 400,
          title: 'Bad Request',
          detail: 'The request is invalid.',
          code: 'invalid',
          errors: { password: 'Password is required', ignored: 42 }
        },
        { 'x-correlation-id': 'abc-123' }
      )
    );

    // Act
    const error = await catchError(httpClient.post('/things', {}));

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('The request is invalid.');
    expect(error.fieldErrors).toEqual({ password: 'Password is required' });
    expect(error.details).toMatchObject({
      code: 'invalid',
      method: 'POST',
      path: '/things',
      correlationId: 'abc-123'
    });
  });

  it('uses a generic message when the error body is not JSON', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(502, '<html>Bad gateway</html>'));

    // Act
    const error = await catchError(httpClient.post('/things', {}));

    // Assert
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe(UNKNOWN_ERROR_MESSAGE);
    expect(error.fieldErrors).toEqual({});
  });

  it('uses a generic message when the error body has no usable detail', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(500, null));

    // Act
    const error = await catchError(httpClient.post('/things', {}));

    // Assert
    expect(error.message).toBe(UNKNOWN_ERROR_MESSAGE);
  });

  it('explains a 413 that carries no message of its own', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(413, ''));

    // Act
    const error = await catchError(httpClient.post('/things', {}));

    // Assert
    expect(error.message).toBe(PAYLOAD_TOO_LARGE_MESSAGE);
  });

  it('reports a lost connection as status zero', async () => {
    // Arrange
    http.handler.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    const error = await catchError(httpClient.post('/things', {}));

    // Assert
    expect(error.statusCode).toBe(NETWORK_ERROR_STATUS);
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('reports a failure to get the CSRF token as a lost connection', async () => {
    // Arrange
    http.setNetworkDown(true);

    // Act
    const error = await catchError(httpClient.post('/things', {}));

    // Assert
    expect(error.statusCode).toBe(NETWORK_ERROR_STATUS);
  });

  it('passes a per-request timeout through', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonResponse200());

    // Act
    await httpClient.post('/things', {}, { timeout: 5 });

    // Assert
    expect(http.handler.mock.calls[0][0].timeout).toBe(5);
  });

  it('tells the unauthorized handler when the session is no longer valid', async () => {
    // Arrange
    const calls: number[] = [];
    setUnauthorizedHandler(() => calls.push(1));
    http.handler.mockResolvedValue(problemReply(401, 'Authentication is required.'));

    // Act
    const error = await catchError(httpClient.get('/vaults'));

    // Assert
    expect(error.statusCode).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it('does not treat a 401 as an expired session for requests that opt out', async () => {
    // Arrange
    const calls: number[] = [];
    setUnauthorizedHandler(() => calls.push(1));
    http.handler.mockResolvedValue(problemReply(401, 'No session.'));

    // Act
    await catchError(httpClient.get('/auth/session', { canExpireSession: false }));

    // Assert
    expect(calls).toHaveLength(0);
  });
});

describe('authApi', () => {
  it('signs up through the app server and returns the address the verification link went to, never a token', async () => {
    // Arrange
    const created = { status: 'verification_required', email: 'jd@example.com' };
    http.handler.mockResolvedValue(jsonReply(201, created));

    // Act
    const result = await signup({ email: 'jd@example.com', password: 'Passw0rd!' });

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/auth/signup');
    expect(request.body).toEqual({ email: 'jd@example.com', password: 'Passw0rd!' });
    expect(result).toEqual(created);
    expect(result).not.toHaveProperty('accessToken');
  });

  it('treats a signup answer it cannot read as an unexpected error', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201, '<html></html>'));

    // Act
    const error = await catchError(signup({ email: 'jd@example.com', password: 'Passw0rd!' }));

    // Assert
    expect(error.statusCode).toBe(201);
    expect(error.message).toBe(UNKNOWN_ERROR_MESSAGE);
  });

  it('does not treat a refused signup as an expired session', async () => {
    // Arrange
    const calls: number[] = [];
    setUnauthorizedHandler(() => calls.push(1));
    http.handler.mockResolvedValue(problemReply(401, 'Nope'));

    // Act
    await catchError(signup({ email: 'jd@example.com', password: 'Passw0rd!' }));

    // Assert
    expect(calls).toHaveLength(0);
  });

  it('logs in through the app server', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201, SESSION_BODY));

    // Act
    const result = await login({ email: 'jd@example.com', password: 'Passw0rd!' });

    // Assert
    expect(http.handler.mock.calls[0][0].path).toBe('/auth/login');
    expect(result).toEqual(SESSION_BODY);
  });

  it('logs out with a POST to the logout endpoint', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(204));

    // Act
    await logout();

    // Assert
    expect(http.handler.mock.calls[0][0]).toMatchObject({ method: 'POST', path: '/auth/logout' });
  });

  it('reads the current session', async () => {
    // Arrange
    const session = { user: { id: 'u1', email: 'jd@example.com' }, expiresAt: 1_800_000_000_000 };
    http.handler.mockResolvedValue(jsonReply(200, session));

    // Act
    const result = await fetchSession();

    // Assert
    expect(result).toEqual(session);
  });

  it('reports no session as null rather than an error', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(401, 'There is no active session.'));

    // Act
    const result = await fetchSession();

    // Assert
    expect(result).toBeNull();
  });

  it('rethrows other failures while reading the session', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(500, 'Boom'));

    // Act
    const error = await catchError(fetchSession());

    // Assert
    expect(error.statusCode).toBe(500);
  });

  it('treats a session answer it cannot read as an unexpected error', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(200, { nope: true }));

    // Act
    const error = await catchError(fetchSession());

    // Assert
    expect(error.statusCode).toBe(200);
  });
});

describe('migrateVaults', () => {
  const payload = { vaults: [], folders: [], files: [], backlinks: [] };

  it('posts the payload to the migrate endpoint with a long timeout and no credentials of its own', async () => {
    // Arrange
    http.handler.mockResolvedValue(jsonReply(201));

    // Act
    await migrateVaults(payload);

    // Assert
    const request = http.handler.mock.calls[0][0];
    expect(request.path).toBe('/vaults/migrate');
    expect(request.timeout).toBe(MIGRATION_TIMEOUT_MS);
    expect(request.headers).not.toHaveProperty('authorization');
    expect(request.headers['x-csrf-token']).toBe(TEST_CSRF_TOKEN);
  });

  it('recognises the refusal for data that is already stored', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, ALREADY_MIGRATED_MESSAGE));

    // Act
    const error = await catchError(migrateVaults(payload));

    // Assert
    expect(isAlreadyMigrated(error)).toBe(true);
  });

  it('does not mistake another bad request for data that is already stored', async () => {
    // Arrange
    http.handler.mockResolvedValue(problemReply(400, 'Some other problem.'));

    // Act
    const error = await catchError(migrateVaults(payload));

    // Assert
    expect(isAlreadyMigrated(error)).toBe(false);
  });
});

/**
 * Builds an empty 200 reply.
 */
function jsonResponse200() {
  return jsonReply(200, {});
}
