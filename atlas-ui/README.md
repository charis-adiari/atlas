This is a project using [Next.js](https://nextjs.org) (App Router), React, TypeScript and CSS Modules bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install dependencies:

```bash
npm install
```

Now you can run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

The browser never holds the access token. The app's own server sits between the browser and the Atlas API (a backend-for-frontend), so the API's authentication is unchanged.

- The browser only calls this app under `/api/v1/*` (one shared Axios client, `src/lib/api/httpClient.ts`). Route handlers in `src/app/api/v1/` and `src/server/` forward to the API.
- On signup (and login, once the API has an endpoint) the server keeps the API's JWT in an **HttpOnly** cookie and tells the page only the user and the lifetime. The cookie is `SameSite=Lax`, covers the whole site, and lasts as long as the token (capped at a day). In production it is `Secure` and named with the `__Host-` prefix.
- Protected API calls go through `/api/v1/[...path]`, which reads the cookie and sends the token to the API as a Bearer header. Nothing else from the browser is forwarded.
- **CSRF:** every state-changing request must carry an `X-CSRF-Token` header equal to an HttpOnly CSRF cookie (double submit), and its `Origin` and `Sec-Fetch-Site` must be same-site. The client fetches the token from `GET /api/v1/auth/csrf` and retries once if the server has rotated it.
- **Pages:** `src/proxy.ts` redirects anonymous visitors away from `/account`. The page also checks again on the client, so a session that ends while it is open sends the user home.
- **Expiry:** the API's tokens last one hour (`app.auth.token-ttl`). When one expires the cookie goes with it, the page signs the user out by itself and shows a notice, and the next protected call answers 401. There are no refresh tokens: the API has none, and an hour is short enough to limit damage from a stolen cookie. Add them only if users must stay signed in longer.
- **Errors:** expected failures (duplicate email, invalid details, lost connection) get a friendly message. Anything unexpected shows a generic message while the technical details go to `logUnexpectedError` (`src/lib/logging/logger.ts`), which writes to the console until `setErrorLogSink` points it at a monitoring service.

Placeholders that are meant to be replaced:

- Login: the server route exists (`/api/v1/auth/login`) but the API has no login endpoint yet, and there is no login screen.
- Email verification: `src/lib/auth/verification/emailVerification.ts` is a replaceable provider. The default requires nothing, so signup is unchanged; plug in a provider with `setEmailVerificationProvider` and the "check your inbox" step appears.
- The `/account` page and the log-out button are minimal stand-ins for the real account screens.
- Local vault storage (see below) is being built by another team member.

## Configuration

All settings are optional and read on the server unless noted.

- `API_PROXY_TARGET` (default `http://localhost:8080`): where the Atlas API lives.
- `NEXT_PUBLIC_API_BASE_URL` (default `/api/v1`, read in the browser): where the page sends its requests. Leave it alone: it points at this app's own server.
- `APP_ORIGINS` (comma-separated, for example `https://atlas.example.com`): the origins allowed to make state-changing requests. Required behind a reverse proxy or load balancer that terminates TLS, because the app then sees an internal origin and would refuse every POST. Without it the request's own origin is used.
- `COOKIE_SECURE`: cookies are `Secure` in production by default. Set `false` only for a production build served over plain HTTP, such as a local test.

In production serve the app over HTTPS only. It sends `Strict-Transport-Security`, but redirecting HTTP to HTTPS is up to the proxy or host.

## Local vault data and migration

After a successful signup the UI looks for vault data kept on the device. If there is some, it asks whether to migrate it. Nothing about local vaults is stored yet, so whatever persists them must use this contract:

- Key `atlas.local-vault-data` in `localStorage`, holding JSON with four flat lists: `vaults`, `folders`, `files` and `backlinks`. The fields are those of the API's migration payload (`src/types/migration.ts`). Ids are UUIDs, and timestamps are ISO-8601 strings (epoch milliseconds are converted).
- Only the fields the API knows are uploaded; anything else stored alongside them is ignored.
- The upload is one all-or-nothing request to `POST /api/v1/vaults/migrate`. It is tried up to 3 times, pausing 1s and then 2s, when the server cannot be reached or has a problem. After that the user can retry or continue without migrating.
- Local data is never deleted. Once the API confirms the upload, the migrated vault ids are recorded under `atlas.local-vault-data.migrated`, so those vaults are not offered again. Vaults created later are still offered.

## Testing

```bash
npm test
npm run test:coverage
```

The acceptance criteria of US-02 (signup, migration prompt, confirm, decline, failed signup, network failure during migration), logout and token expiry are tested end to end in `src/components/account/AuthEntry.acceptance.test.tsx`. They run the real UI against an in-memory fake of the API as the browser sees it (`src/test/FakeAtlasApi.ts`), which models the cookie session, enforces the CSRF header, follows the API's rules and can simulate a failing network.

The server side (cookies, CSRF, the authenticated proxy, the protected-route guard) is tested in `src/server` and `src/proxy.test.ts` against a mocked API.

## Code Style Guide

This extends the [root style guide](../README.md#code-style-guide). Rules here apply only within the UI subfolder.

### Formatting

Prettier + ESLint are used for formatting. Run before opening a PR as CI fails on violations:

```bash
npm run lint
npm run prettier
```

### Documentation Comments

- TSDoc comments are generally required for:
  - All classes, unless inherited from an interface/abstract class that already carries the comment.
  - All non-constructor methods, including private ones unless overriding a parent interface/abstract class method that already carries the comment.
- If overridden behaviour diverges meaningfully from the parent's documented contract, add comments for the child class.
- No other kinds of comments should be left in code. Write code that is readable with obvious names. PRs with comments will be rejected outright.

### Components

- One component per file; file name matches the component name (see [Naming](#naming)).
- Props are typed with an explicit `interface` or `type`, named `<ComponentName>Props`. Avoid inline prop typing for anything beyond one or two trivial props.
- Destructure props in the function signature rather than accessing via a `props` object.
- Keep components focused on rendering; extract non-trivial logic (data transforms, calculations) into plain functions in `lib/` or into hooks, not inline in JSX or the component body.

### Styling

- Avoid inline `style={{ ... }}` except for genuinely dynamic, computed-at-runtime values (e.g. a value from a calculation). Static styling always goes in the module file.

### Naming Conventions

- Casing generally follows the React + Next.js conventions.
- **Hooks:** always prefixed `use` - `useUserData`, not `getUserData` if it's actually a hook.
- **Route folders:** `kebab-case`, matching the URL — `app/user-settings/page.tsx`.

### Type Safety

- `any` is not allowed, except in tests.

### Testing

- Tests live alongside the code they test (`foo.ts` → `foo.test.ts`)
- Name test cases by behaviour, not implementation: `it("rejects expired tokens")`, not `it("test 3")`.
- Every test must include AAA comments (`// Arrange`, `// Act`, `// Assert`) marking each section, unless the section is empty.
- A test coverage of 80% must be maintained
