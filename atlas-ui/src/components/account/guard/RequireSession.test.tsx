import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { endSession, resetAuthState, startSession } from '@/lib/auth/session/authSessionStore';
import { AUTH_REQUIRED_PATH } from '@/lib/auth/routes';
import { HttpMock, jsonReply, problemReply } from '@/test/HttpMock';
import { routerMock } from '@/test/navigationMock';
import { RequireSession } from './RequireSession';

const http = new HttpMock();
const USER = { id: 'user-1', email: 'jd@example.com' };

afterEach(() => {
  http.uninstall();
  resetAuthState();
  routerMock.replace.mockReset();
});

describe('RequireSession', () => {
  it('shows its content to a signed-in user', () => {
    // Arrange
    http.install();
    startSession(USER, Date.now() + 60_000);

    // Act
    render(
      <RequireSession>
        <p>Private page</p>
      </RequireSession>
    );

    // Assert
    expect(screen.getByText('Private page')).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('shows nothing and does not redirect while it is still finding out whether there is a session', () => {
    // Arrange
    http.install();
    http.handler.mockReturnValue(new Promise(() => undefined));

    // Act
    render(
      <RequireSession>
        <p>Private page</p>
      </RequireSession>
    );

    // Assert
    expect(screen.queryByText('Private page')).not.toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it('hides its content and sends an anonymous visitor home', async () => {
    // Arrange
    http.install();
    http.handler.mockResolvedValue(problemReply(401, 'There is no active session.'));

    // Act
    render(
      <RequireSession>
        <p>Private page</p>
      </RequireSession>
    );

    // Assert
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(AUTH_REQUIRED_PATH));
    expect(screen.queryByText('Private page')).not.toBeInTheDocument();
  });

  it('shows its content once the session cookie has been found', async () => {
    // Arrange
    http.install();
    http.handler.mockResolvedValue(jsonReply(200, { user: USER, expiresAt: Date.now() + 60_000 }));

    // Act
    render(
      <RequireSession>
        <p>Private page</p>
      </RequireSession>
    );

    // Assert
    expect(await screen.findByText('Private page')).toBeInTheDocument();
  });

  it('sends the user home when the session ends while the page is open', async () => {
    // Arrange
    http.install();
    startSession(USER, Date.now() + 60_000);
    render(
      <RequireSession>
        <p>Private page</p>
      </RequireSession>
    );

    // Act
    act(() => endSession('expired'));

    // Assert
    expect(screen.queryByText('Private page')).not.toBeInTheDocument();
    expect(routerMock.replace).toHaveBeenCalledWith(AUTH_REQUIRED_PATH);
  });
});
