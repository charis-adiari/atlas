import { ALREADY_MIGRATED_MESSAGE } from '@/lib/api/migrationApi';
import type { LoginRequest, SignupRequest } from '@/types/auth';
import type { MigrationRequest } from '@/types/migration';
import { HttpMock, jsonReply, problemReply, type MockReply, type MockRequest } from './HttpMock';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MAX_LENGTH = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const DEFAULT_SESSION_SECONDS = 3600;
const MILLIS_PER_SECOND = 1000;

export const ACCOUNT_REFUSED_DETAIL = 'The account could not be created with the details provided.';
export const INVALID_LINK_DETAIL = 'The verification link is invalid or has expired.';
export const INVALID_CREDENTIALS_DETAIL = 'The email or password is incorrect.';
export const EMAIL_NOT_VERIFIED_DETAIL = 'Verify your email address before signing in.';

export type MigrationFault = 'network-error' | 'server-error' | 'lost-response';

/**
 * Represents an account the fake API knows about.
 */
export interface FakeAccount {
  id: string;
  email: string;
  password: string;
  isVerified: boolean;
}

/**
 * Represents a request the fake API received.
 */
export interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Stands in for the Atlas API as the browser sees it, that is, through this app's own server. It follows the real rules
 * for the endpoints the signup flow uses: the same password rules, one account per normalised email, a session that the
 * browser keeps in a cookie the page cannot read, and a migration that stores everything or nothing and refuses data whose
 * ids already exist, answering with an empty body. Like the real API it emails a verification link at signup without
 * starting a session, starts one only when the link is opened or a verified account logs in, answers a resend the same
 * way whether or not the address has an account, and gives a duplicate email the same vague refusal as any other
 * unusable details. Faults can be queued to simulate a network that fails partway through, and the session can be
 * expired to simulate the cookie running out.
 */
export class FakeAtlasApi {
  readonly requests: RecordedRequest[] = [];
  readonly http = new HttpMock();

  private readonly accounts = new Map<string, FakeAccount>();
  private readonly vaultsByUser = new Map<string, MigrationRequest>();
  private readonly migrationFaults: MigrationFault[] = [];
  private readonly rejectedPasswords = new Set<string>();
  private readonly verificationTokens = new Map<string, string>();
  private sessionUserId: string | null = null;
  private sessionSeconds = DEFAULT_SESSION_SECONDS;

  constructor() {
    this.http.handler.mockImplementation((request) => this.handle(request));
  }

  /**
   * Routes the shared HTTP client through this fake for the current test.
   */
  install(): void {
    this.http.install();
  }

  /**
   * Restores the real transport.
   */
  uninstall(): void {
    this.http.uninstall();
  }

  /**
   * Registers an account directly, as if the person had signed up earlier.
   */
  addAccount(email: string, password: string): FakeAccount {
    const account = {
      id: crypto.randomUUID(),
      email: email.trim().toLowerCase(),
      password,
      isVerified: false
    };
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
   * Gets the token in the most recent verification link emailed to an account, or undefined if none was sent.
   */
  getVerificationToken(email: string): string | undefined {
    const userId = this.findAccount(email)?.id;
    return [...this.verificationTokens].find(([, owner]) => owner === userId)?.[0];
  }

  /**
   * Opens the latest link emailed to an account, as the person would in another tab of the same browser: the account
   * is verified and the browser gets a session cookie, which every tab shares.
   */
  openVerificationLink(email: string): void {
    const token = this.getVerificationToken(email);
    if (token === undefined) {
      throw new Error(`No verification link was emailed to ${email}`);
    }
    this.verifyEmail(token);
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
   * Gives the browser a valid session cookie for an account, as if it had verified its address or logged in earlier.
   * Only a verified account can have a session, so the account counts as verified from now on.
   */
  signInAs(account: FakeAccount): void {
    account.isVerified = true;
    this.sessionUserId = account.id;
  }

  /**
   * Gets the id of the account the browser's session cookie belongs to, or null if there is no valid cookie.
   */
  getSessionUserId(): string | null {
    return this.sessionUserId;
  }

  /**
   * Sets how long the sessions the server starts from now on last, in seconds.
   */
  setSessionSeconds(seconds: number): void {
    this.sessionSeconds = seconds;
  }

  /**
   * Makes the browser's session cookie stop being valid, as when the token expires.
   */
  expireSession(): void {
    this.sessionUserId = null;
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
    this.http.setNetworkDown(isDown);
  }

  /**
   * Routes a request to the endpoint it is for.
   */
  private handle(request: MockRequest): MockReply {
    this.requests.push({
      method: request.method,
      path: request.path,
      headers: request.headers,
      body: request.body
    });

    if (request.path === '/auth/signup') {
      return this.signup(request.body as SignupRequest);
    }
    if (request.path === '/auth/session') {
      return this.session();
    }
    if (request.path === '/auth/verify-email') {
      return this.verifyEmail((request.body as { token: string }).token);
    }
    if (request.path === '/auth/resend-verification') {
      return this.resendVerification((request.body as { email: string }).email);
    }
    if (request.path === '/auth/login') {
      return this.login(request.body as LoginRequest);
    }
    if (request.path === '/auth/logout') {
      this.sessionUserId = null;
      return jsonReply(204);
    }
    if (request.path === '/vaults/migrate') {
      return this.migrate(request.body as MigrationRequest);
    }
    return problemReply(404, 'Not found');
  }

  /**
   * Creates an account and emails it a verification link, or explains why it cannot. No session starts.
   */
  private signup(request: SignupRequest): MockReply {
    const email = request.email.trim().toLowerCase();
    const errors = this.validateCredentials(email, request.password);

    if (Object.keys(errors).length > 0) {
      return problemReply(400, 'The request is invalid.', errors);
    }
    if (this.accounts.has(email)) {
      return problemReply(400, ACCOUNT_REFUSED_DETAIL);
    }

    const account = this.addAccount(email, request.password);
    this.issueVerificationToken(account.id);
    return jsonReply(201, { status: 'verification_required', email: account.email });
  }

  /**
   * Starts a session for a verified account whose password is right. The password is checked first, so a wrong one
   * gets the same answer whether or not the account exists or is verified.
   */
  private login(request: LoginRequest): MockReply {
    const account = this.findAccount(request.email);

    if (account?.password !== request.password) {
      return problemReply(401, INVALID_CREDENTIALS_DETAIL);
    }
    if (!account.isVerified) {
      return problemReply(403, EMAIL_NOT_VERIFIED_DETAIL, undefined, 'EMAIL_NOT_VERIFIED');
    }
    return this.startSession(account);
  }

  /**
   * Gives the browser a session cookie for the account and answers with what the app's server tells the page.
   */
  private startSession(account: FakeAccount): MockReply {
    this.sessionUserId = account.id;
    return jsonReply(200, {
      user: { id: account.id, email: account.email },
      expiresIn: this.sessionSeconds
    });
  }

  /**
   * Replaces the verification token of an account, so only the latest link works.
   */
  private issueVerificationToken(userId: string): void {
    for (const [token, owner] of this.verificationTokens) {
      if (owner === userId) {
        this.verificationTokens.delete(token);
      }
    }
    this.verificationTokens.set(crypto.randomUUID(), userId);
  }

  /**
   * Verifies the account a token was issued for, uses the token up and signs the account in.
   */
  private verifyEmail(token: string): MockReply {
    const userId = this.verificationTokens.get(token);
    const account = [...this.accounts.values()].find((candidate) => candidate.id === userId);

    if (account === undefined) {
      return problemReply(400, INVALID_LINK_DETAIL);
    }
    account.isVerified = true;
    this.verificationTokens.delete(token);
    return this.startSession(account);
  }

  /**
   * Emails a new verification link to the address if it belongs to an account that is not verified yet. The answer is
   * the same either way.
   */
  private resendVerification(email: string): MockReply {
    const account = this.findAccount(email);

    if (account !== undefined && !account.isVerified) {
      this.issueVerificationToken(account.id);
    }
    return jsonReply(202);
  }

  /**
   * Reports the session the browser's cookie stands for, if it is still valid.
   */
  private session(): MockReply {
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.id === this.sessionUserId
    );

    if (account === undefined) {
      return problemReply(401, 'There is no active session.');
    }
    return jsonReply(200, {
      user: { id: account.id, email: account.email },
      expiresAt: Date.now() + this.sessionSeconds * MILLIS_PER_SECOND
    });
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
   * Stores the payload for the account the session belongs to, applying any queued fault.
   */
  private migrate(payload: MigrationRequest): MockReply {
    if (this.sessionUserId === null) {
      return problemReply(401, 'Authentication is required.');
    }

    const fault = this.migrationFaults.shift();
    if (fault === 'network-error') {
      throw new TypeError('Failed to fetch');
    }
    if (fault === 'server-error') {
      return problemReply(503, 'An unexpected error occurred.');
    }

    const reply = this.store(this.sessionUserId, payload);
    if (fault === 'lost-response') {
      throw new TypeError('Failed to fetch');
    }
    return reply;
  }

  /**
   * Stores everything or nothing: data whose ids already exist anywhere is refused as a whole.
   */
  private store(userId: string, payload: MigrationRequest): MockReply {
    const knownIds = new Set(
      [...this.vaultsByUser.values()].flatMap((stored) =>
        [...stored.vaults, ...stored.folders, ...stored.files].map((record) => record.id)
      )
    );
    const incoming = [...payload.vaults, ...payload.folders, ...payload.files];

    if (incoming.some((record) => knownIds.has(record.id))) {
      return problemReply(400, ALREADY_MIGRATED_MESSAGE);
    }

    this.vaultsByUser.set(userId, structuredClone(payload));
    return jsonReply(201);
  }
}
