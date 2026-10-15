import { vi } from 'vitest';
import type { SignupRequest, SignupResponse } from '@/types/auth';
import type { MigrationRequest } from '@/types/migration';

const SIGNUP_PATH = '/api/v1/auth/signup';
const MIGRATE_PATH = '/api/v1/vaults/migrate';
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MAX_LENGTH = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const TOKEN_PREFIX = 'fake-jwt.';

export type MigrationFault = 'network-error' | 'server-error' | 'lost-response';

/**
 * Represents an account the fake API knows about.
 */
export interface FakeAccount {
  id: string;
  email: string;
  password: string;
}

/**
 * Represents a request the fake API received.
 */
export interface RecordedRequest {
  path: string;
  authorization: string | null;
  body: unknown;
}

/**
 * Stands in for the Atlas API in tests. It follows the real API's rules for the endpoints the signup flow uses: the
 * same password rules, one account per normalised email, an access token that identifies the account, and a migration
 * that stores everything or nothing and refuses data whose ids already exist. Faults can be queued to simulate a
 * network that fails partway through.
 */
export class FakeAtlasApi {
  readonly requests: RecordedRequest[] = [];

  private readonly accounts = new Map<string, FakeAccount>();
  private readonly vaultsByUser = new Map<string, MigrationRequest>();
  private readonly migrationFaults: MigrationFault[] = [];
  private readonly rejectedPasswords = new Set<string>();
  private isNetworkDown = false;

  /**
   * Replaces the global fetch with this fake for the current test.
   */
  install(): void {
    vi.stubGlobal('fetch', this.fetch);
  }

  /**
   * Registers an account directly, as if the person had signed up earlier.
   */
  addAccount(email: string, password: string): FakeAccount {
    const account = { id: crypto.randomUUID(), email: email.trim().toLowerCase(), password };
    this.accounts.set(account.email, account);
    return account;
  }

  /**
   * Finds the account registered for an email address, however it is capitalised.
   */
  findAccount(email: string): FakeAccount | undefined {
    return this.accounts.get(email.trim().toLowerCase());
  }

  /**
   * Gets what is stored on the server for an account, or undefined if nothing is.
   */
  getVaultsOf(userId: string): MigrationRequest | undefined {
    return this.vaultsByUser.get(userId);
  }

  /**
   * Gets the ids of the accounts that have any vault stored.
   */
  getVaultOwnerIds(): string[] {
    return [...this.vaultsByUser.keys()];
  }

  /**
   * Counts the requests received for a path.
   */
  countRequests(path: string): number {
    return this.requests.filter((request) => request.path === path).length;
  }

  /**
   * Makes the server refuse a password the client considers fine, as a stricter backend rule would.
   */
  rejectPassword(password: string): void {
    this.rejectedPasswords.add(password);
  }

  /**
   * Queues faults for the next migration requests, one per request, in order. A request with no fault queued succeeds.
   */
  queueMigrationFaults(...faults: MigrationFault[]): void {
    this.migrationFaults.push(...faults);
  }

  /**
   * Cuts or restores the network for every request.
   */
  setNetworkDown(isDown: boolean): void {
    this.isNetworkDown = isDown;
  }

  /**
   * Handles a request the way fetch would.
   */
  private readonly fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const path = new URL(String(input), 'http://localhost').pathname;
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    const authorization = new Headers(init?.headers).get('Authorization');
    this.requests.push({ path, authorization, body });

    if (this.isNetworkDown) {
      throw new TypeError('Failed to fetch');
    }
    if (path === SIGNUP_PATH) {
      return this.signup(body as SignupRequest);
    }
    if (path === MIGRATE_PATH) {
      return this.migrate(authorization, body as MigrationRequest);
    }
    return problem(404, 'Not found');
  };

  /**
   * Creates an account, or explains why it cannot.
   */
  private signup(request: SignupRequest): Response {
    const email = request.email.trim().toLowerCase();
    const errors = this.validateCredentials(email, request.password);

    if (Object.keys(errors).length > 0) {
      return problem(400, 'The request is invalid.', errors);
    }
    if (this.accounts.has(email)) {
      return problem(409, 'An account with this email already exists.');
    }

    const account = this.addAccount(email, request.password);
    const response: SignupResponse = {
      user: { id: account.id, email: account.email },
      accessToken: `${TOKEN_PREFIX}${account.id}`,
      tokenType: 'Bearer',
      expiresIn: 3600
    };
    return new Response(JSON.stringify(response), { status: 201 });
  }

  /**
   * Checks the email and password the way the real API does.
   */
  private validateCredentials(email: string, password: string): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (
      !PASSWORD_PATTERN.test(password) ||
      password.length > PASSWORD_MAX_LENGTH ||
      this.rejectedPasswords.has(password)
    ) {
      errors.password = 'Password is too weak';
    }
    return errors;
  }

  /**
   * Stores the payload for the account the token belongs to, applying any queued fault.
   */
  private migrate(authorization: string | null, payload: MigrationRequest): Response {
    const userId = this.userIdFrom(authorization);
    if (userId === null) {
      return new Response(null, { status: 401 });
    }

    const fault = this.migrationFaults.shift();
    if (fault === 'network-error') {
      throw new TypeError('Failed to fetch');
    }
    if (fault === 'server-error') {
      return problem(503, 'An unexpected error occurred.');
    }

    const response = this.store(userId, payload);
    if (fault === 'lost-response') {
      throw new TypeError('Failed to fetch');
    }
    return response;
  }

  /**
   * Stores everything or nothing: data whose ids already exist anywhere is refused as a whole.
   */
  private store(userId: string, payload: MigrationRequest): Response {
    const knownIds = new Set(
      [...this.vaultsByUser.values()].flatMap((stored) =>
        [...stored.vaults, ...stored.folders, ...stored.files].map((record) => record.id)
      )
    );
    const incoming = [...payload.vaults, ...payload.folders, ...payload.files];

    if (incoming.some((record) => knownIds.has(record.id))) {
      return problem(409, 'Some of this data has already been migrated.');
    }

    this.vaultsByUser.set(userId, structuredClone(payload));
    return new Response(
      JSON.stringify({
        vaults: payload.vaults.length,
        folders: payload.folders.length,
        files: payload.files.length,
        backlinks: payload.backlinks.length
      }),
      { status: 201 }
    );
  }

  /**
   * Reads the account id out of a bearer token, or returns null if the token is not one this API issued.
   */
  private userIdFrom(authorization: string | null): string | null {
    const token = authorization?.replace(/^Bearer /, '') ?? '';
    return token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
  }
}

/**
 * Builds an error response in the API's problem-details format.
 */
function problem(statusCode: number, detail: string, errors?: Record<string, string>): Response {
  const body = { statusCode, title: 'Problem', detail, errors };
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/problem+json' }
  });
}
