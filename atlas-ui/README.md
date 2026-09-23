This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Code Style Guide

This extends the [root style guide](../README.md#code-style-guide). Rules here apply only within the UI subfolder.

**Stack:** Next.js (App Router), React, TypeScript, CSS Modules.

### Components

- One component per file; file name matches the component name (see [Naming](#naming)).
- Props are typed with an explicit `interface` or `type`, named `<ComponentName>Props`. Avoid inline prop typing for anything beyond one or two trivial props.
- Destructure props in the function signature rather than accessing via a `props` object.
- Keep components focused on rendering; extract non-trivial logic (data transforms, calculations) into plain functions in `lib/` or into hooks, not inline in JSX or the component body.

### Styling

- CSS Modules, colocated with the component: `ComponentName.module.css` next to `ComponentName.tsx`.
- Avoid inline `style={{ ... }}` except for genuinely dynamic, computed-at-runtime values (e.g. a value from a calculation). Static styling always goes in the module file.

### Naming

- **Component files & component names:** `PascalCase` — `UserCard.tsx` exporting `UserCard`.
- **Non-component files** (hooks, utils, lib functions): `camelCase` - `useUserData.ts`, `formatDate.ts`.
- **Hooks:** always prefixed `use` - `useUserData`, not `getUserData` if it's actually a hook.
- **Route folders:** `kebab-case`, matching the URL — `app/user-settings/page.tsx`.
