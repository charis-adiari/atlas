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
