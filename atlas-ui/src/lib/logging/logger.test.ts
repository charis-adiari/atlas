import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/apiError';
import { logUnexpectedError, setErrorLogSink, type ErrorLogEntry } from './logger';

afterEach(() => {
  setErrorLogSink(null);
  vi.restoreAllMocks();
});

describe('logUnexpectedError', () => {
  it('records the technical details of an API error under the given context', () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    const error = new ApiError(
      500,
      'NullPointerException at AuthService:42',
      {},
      {
        method: 'POST',
        path: '/auth/signup',
        correlationId: 'abc-123',
        code: 'internal'
      }
    );

    // Act
    logUnexpectedError('signup', error);

    // Assert
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({
      context: 'signup',
      name: 'ApiError',
      message: 'NullPointerException at AuthService:42',
      statusCode: 500,
      method: 'POST',
      path: '/auth/signup',
      correlationId: 'abc-123',
      code: 'internal'
    });
    expect(Number.isNaN(Date.parse(sink.mock.calls[0][0].loggedAt))).toBe(false);
  });

  it('records a plain error by name and message', () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);

    // Act
    logUnexpectedError('migration', new TypeError('boom'));

    // Assert
    expect(sink.mock.calls[0][0]).toMatchObject({
      context: 'migration',
      name: 'TypeError',
      message: 'boom'
    });
  });

  it('records something that is not an error as text', () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);

    // Act
    logUnexpectedError('logout', 'just a string');

    // Assert
    expect(sink.mock.calls[0][0]).toMatchObject({ name: 'UnknownError', message: 'just a string' });
  });

  it('cuts very long messages', () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);

    // Act
    logUnexpectedError('signup', new Error('x'.repeat(1000)));

    // Assert
    expect(sink.mock.calls[0][0].message.length).toBeLessThan(400);
  });

  it('never includes a request body, password or token', () => {
    // Arrange
    const sink = vi.fn<(entry: ErrorLogEntry) => void>();
    setErrorLogSink(sink);
    const error = new ApiError(500, 'failed', {}, { method: 'POST', path: '/auth/signup' });
    Object.assign(error, { requestBody: { password: 'Secret-Passw0rd!' } });

    // Act
    logUnexpectedError('signup', error);

    // Assert
    expect(JSON.stringify(sink.mock.calls[0][0])).not.toContain('Secret-Passw0rd!');
  });

  it('writes to the console until a sink is set', () => {
    // Arrange
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Act
    logUnexpectedError('signup', new Error('boom'));

    // Assert
    expect(spy).toHaveBeenCalledWith('[atlas]', expect.objectContaining({ context: 'signup' }));
  });
});
