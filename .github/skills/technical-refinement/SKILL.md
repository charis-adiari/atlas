---
name: technical-refinement
description: Break down an Atlas user story into implementation-ready technical tasks of 0.5 to 2 developer days. Use when a user provides a story number such as US-09 or its name, asks for a technical breakdown, or wants help turning a user story into developer work.
argument-hint: user story number (e.g. 9), US-09, user story name
user-invocable: true
---

# Technical Backlog Refinement

Turn one Atlas user story into a small, ordered set of technical tasks a developer can complete independently in 0.5 to 2 days each. A developer day is one day of focused work by a junior-to-intermediate developer. This workflow produces a task breakdown; it does not implement the work or edit planning documents unless the user explicitly asks.

## Source of Truth

- Find stories in `.wiki/`. Currently [04-user-stories v3.md](../../../.wiki/04-user-stories%20v3.md).
- Treat the selected story's context, acceptance criteria, dependencies and priority as the product scope. Do not silently rewrite or resolve contradictions in the story.
- Before proposing implementation tasks, inspect only the relevant project documentation, code, tests, and build configuration needed to understand the current architecture. Base technology choices on the repository rather than assuming an idealised design.
- Never assume prerequisite work is done. Do not infer completion from story numbering (e.g. that lower-numbered stories are finished) or from a prerequisite not being mentioned in the story. Completion must be confirmed by the repository or by the user.

## Workflow

1. **Find the story.** Match a `US-##` identifier or a story name against the story headings. Read the complete matching story, including its acceptance criteria and dependencies. You do not need to read linked requirement references as they do not give any substantial extra detail.
2. **Confirm the match.** If there is exactly one clear match for the supplied `US-##` or story name, proceed without asking for confirmation. Only ask one concise question when no story matches, multiple stories plausibly match, or the requested name is ambiguous enough that the wrong story would materially change scope. Do not guess.
3. **Inspect relevant implementation context.** Follow the story's dependencies only as far as needed. Check for existing code and tests that affect the task design; avoid broad repository exploration. Identify prerequisite work the story needs, whether it is listed as a dependency or only implied (e.g. authentication, data models, shared components), and check whether the repository shows it as implemented.

For stories requiring UI, inspect the relevant screens and components for the specific user-facing controls and interactions the story needs. Do not infer that a feature exists because a related screen, component, or backend capability exists. If a required control or interaction is absent, include its implementation in the task breakdown.
4. **Check for material ambiguity.** Identify unresolved product or technical decisions that would change scope, behaviour, data/API contracts, or the task breakdown. This includes prerequisite work whose status the repository cannot confirm: ask the user what has been done rather than assuming. Ask exactly one focused question per assistant turn, starting with the decision that has the greatest impact. Wait for the answer, then reassess and ask another question only if needed. Do not bundle questions, present a questionnaire, or draft tasks while a material decision remains unresolved. Record each answer under **Decisions** in the output.
5. **Use judgement for non-material choices.** Resolve ordinary implementation details from repository. These conventions are also documented in `.github/instructions`. State any consequential but non-blocking assumptions in the final breakdown instead of interrupting the user. Assumptions must not include the completion status of prerequisite work; that is confirmed in step 3 or asked in step 4. If the user says prerequisite work is not done, include tasks for it only if it falls within the story's scope; otherwise list it as an external blocker under **Risks / open questions**.
6. **Draft and size tasks.** Break the story into ordered, coherent implementation tasks. Each task must be independently actionable and estimated at 0.5, 1, 1.5 or 2 developer days. Include implementation and its appropriate tests in the estimate. Split work that exceeds 2 days; combine fragments smaller than 0.5 days with a closely related task when that remains coherent. If the repository cannot answer a question that does not need to be resolved before drafting, add a time-boxed spike task (max 1 day) and list the question under **Risks / open questions**.
7. **Add a screens task when the story needs UI.** If the story requires new screens or changes to existing ones, include an early task to design the screens and obtain team approval. Its deliverable is the approved screens (and the record of that approval), and any task that implements those screens must depend on it. If a screen design already exists and is approved (confirmed by the repository or the user), do not add the task; note this under **Decisions**.
8. **Check coverage and order.** Ensure the tasks collectively cover the story's acceptance criteria, respect dependencies and include validation. Consider security and permissions, data migrations, error handling, observability, performance, and rollout (e.g. feature flags); include tasks or assumptions only where relevant to the story. Do not add unrelated work, duplicate existing functionality, or invent requirements. Call out external blockers rather than hiding them inside an estimate.

## Clarification Rules

Ask before breaking down the story when its wording leaves a consequential choice open, for example:

- Different interpretations would produce materially different user-visible behaviour.
- A missing policy affects data integrity, permissions, persistence, compatibility, or failure recovery.
- Acceptance criteria conflict with each other.
- The repository cannot establish an important architectural constraint and choosing incorrectly would cause rework.
- The story depends on, or implicitly needs, prior work (other stories or unlisted prerequisites) and the repository cannot confirm whether it has been done.

Ask one neutral, answerable question at a time. Briefly explain the specific decision it resolves. Do not ask the user to choose routine implementation mechanics that can be inferred from the existing codebase, and do not ask about prerequisite work the repository clearly shows as done or not done. Continue the clarification loop until the scope and technical behaviour are sufficiently clear to produce tasks.

## Output

Copy this structure exactly. If a section has no findings, write "None" instead of omitting it.

```md
# US-[number] - [Story name]

**Scope:** [As a..., I want..., so that... from the user story]

## Tasks:
1. **Short task title** - Estimate: [0.5 | 1 | 1.5 | 2] days
   - **Deliverable:** Concrete code or behaviour the developer will produce.
   - **Covers:** Acceptance criteria satisfied (e.g. AC1, AC3).
   - **Depends on:** Earlier task IDs or story dependencies, if any.

## Decisions:
- [Decisions made with the user during clarification]

## Assumptions:
- [Any assumptions for the overall story, excluding the completion status of prerequisite work. E.g. this story assumes access tokens expire after 15 minutes, matching the existing auth configuration]

## Risks / open questions:
- [Unknowns, external blockers, or questions covered by spike tasks]
```

Keep tasks technical and actionable; avoid vague items such as “implement the feature” or standalone testing tasks.