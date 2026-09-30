## Branching & Release Strategy

We use a simplified trunk-based workflow with two long-lived branches. This section explains how branches work, how code is promoted and what to do for hotfixes.

### Why this approach

We're a small team currently pre-MVP, with dev releases every 2 weeks and prod releases not yet active. We chose a lightweight trunk-based model over something like GitFlow to avoid unnecessary process overhead while we're moving fast. `main` represents production even before a prod environment exists.

This doc will be revisited after our first production release to see how real-world hotfixes and rollback scenarios surface edge cases worth incorporating.

### Branch overview

```
feature/*    --->   dev   --->  main
(short-lived)    (deploys      (production
                  to dev        source of truth,
                 every 2wk)     even pre-launch)
```

| Branch | Purpose |
|---|---|
| `main` | Production. Always reflects what is (or will) live in prod. Every commit here should be release-ready. |
| `dev` | Integration branch for ongoing work. Deployed to the dev environment regularly. |
| `feature/*`, `bugfix/*` | Short-lived branches for individual pieces of work. Branch off `dev`, merge back via PR. |
| `hotfix/*` | Urgent production fixes. Branch off `main` (see [Hotfixes](#hotfixes) below). |

### Everyday workflow

1. Branch off `dev`: `feature/<ticket-number>/short-description` or `bugfix/<ticket-number>/short-description`.
2. Keep branches short-lived — aim for days, not weeks. Merge frequently to avoid large conflicts.
3. Open a PR into `dev`. Requires approval(s) and passing CI.
4. If a feature isn't finished in time for the next dev release, wrap it in a feature flag rather than holding the branch open. This lets us keep merging to `dev` continuously.
5. `dev` is deployed to the dev environment.

### Promoting to production (`dev` → `main`)

When we're ready to cut a release:

1. Open a PR from `dev` into `main`.
2. Squash-merge / merge commit (to be decided) into `main`
3. Tag the merge commit on `main` (e.g., `v1.0.0`) for a clear rollback point and release notes.
4. Deploy `main` to production.
5. Merge `main` back into `dev` so `dev` doesn't drift or conflict with what just shipped.

### Hotfixes

Once production is live, urgent fixes that can't wait for the next `dev` to `main` promotion should:

1. Create a hotfix branch off `main`.
2. Fix, test, and PR directly into `main`.
3. Tag and deploy the hotfix.
4. Merge `main` back into `dev` immediately after, so the fix isn't lost or reintroduced as a bug later.

### Branch naming conventions

- `feature/<ticket-number>/<short-description>` - new functionality
- `bugfix/<ticket-number>/<short-description>` - non-urgent fixes
- `hotfix/<ticket-number>/<short-description>` - urgent production fixes
- Use lowercase, hyphen/underscore-separated descriptions (e.g., `feature/5/user-onboarding-flow`)