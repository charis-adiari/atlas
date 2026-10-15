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

## Configuration

The UI calls the API under `/api/v1`. In development the Next.js dev server proxies those requests to the API, so the browser stays on one origin and CORS does not come into play. Both settings are optional:

- `API_PROXY_TARGET` (default `http://localhost:8080`): where `/api/v1/*` is proxied to. Read server-side by `next.config.ts`.
- `NEXT_PUBLIC_API_BASE_URL` (default `/api/v1`): the base URL the browser calls. Set it to the API's full URL to skip the proxy; the API's CORS origin must then allow the UI.

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

The acceptance criteria of US-02 (signup, migration prompt, confirm, decline, failed signup, network failure during migration) are tested end to end in `src/components/account/AuthEntry.acceptance.test.tsx`. They run the real UI against an in-memory fake of the API (`src/test/FakeAtlasApi.ts`) that follows the API's rules and can simulate a failing network.

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
