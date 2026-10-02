---
name: user-story-to-dev-tasks
description: "Break down an Atlas user story into implementation-ready technical tasks of 0.5 to 2 developer days. Use when a user provides a story number such as US-09 or its name, asks for a technical breakdown, or wants help turning a user story into developer work."
argument-hint: "US-09 or the user story name"
user-invocable: true
---

# User Story to Developer Tasks

Turn one Atlas user story into a small, ordered set of technical tasks a developer can complete independently in 0.5 to 2 days each. This workflow produces a task breakdown; it does not implement the work or edit planning documents unless the user explicitly asks.

## Source of Truth

- Find stories in `.wiki/04-user-stories v3.md`.
- Treat the selected story's context, acceptance criteria, dependencies, priority, and links to requirements as the product scope. Do not silently rewrite or resolve contradictions in the story.
- Before proposing implementation tasks, inspect only the relevant project documentation, code, tests, and build configuration needed to understand the current architecture. Base technology choices on the repository rather than assuming an idealized design.
- Locate and read the two example task breakdowns the user wants to use as guidance. Search the workspace and any paths or content the user provides. Match their terminology, format, granularity, and level of detail. Do not claim to have read examples that are not accessible.

## Workflow

1. **Find the story.** Match a `US-##` identifier or a story name against the story headings. Read the complete matching story, including its acceptance criteria, dependencies, and linked requirement references.
2. **Confirm the match.** If no story matches, multiple stories plausibly match, or the requested name is not clear, ask one concise question to identify the intended story. Do not guess.
3. **Locate the examples.** Find and read the two task breakdowns the user refers to. If they are not accessible in the workspace or conversation, ask one question for their location or whether the user wants to proceed without them. Do not silently skip this requested guidance.
4. **Inspect relevant implementation context.** Follow the story's dependencies and requirement links only as far as needed. Check for existing code and tests that affect the task design; avoid broad repository exploration.
5. **Check for material ambiguity.** Identify unresolved product or technical decisions that would change scope, behaviour, data/API contracts, or the task breakdown. Ask exactly one focused question per assistant turn, starting with the decision that has the greatest impact. Wait for the answer, then reassess and ask another question only if needed. Do not bundle questions, present a questionnaire, or draft tasks while a material decision remains unresolved.
6. **Use judgement for non-material choices.** Resolve ordinary implementation details from repository conventions. State any consequential but non-blocking assumptions in the final breakdown instead of interrupting the user.
7. **Draft and size tasks.** Break the story into ordered, coherent implementation tasks. Each task must be independently actionable and estimated between 0.5 and 2 developer days, inclusive. Include implementation and its appropriate tests in the estimate. Split work that exceeds 2 days; combine fragments smaller than 0.5 days with a closely related task when that remains coherent.
8. **Check coverage and order.** Ensure the tasks collectively cover the story's acceptance criteria, respect dependencies, and include validation. Do not add unrelated work, duplicate existing functionality, or invent requirements. Call out external blockers rather than hiding them inside an estimate.

## Clarification Rules

Ask before breaking down the story when its wording leaves a consequential choice open, for example:

- Different interpretations would produce materially different user-visible behaviour.
- A missing policy affects data integrity, permissions, persistence, compatibility, or failure recovery.
- Acceptance criteria conflict with each other or with a linked requirement.
- The repository cannot establish an important architectural constraint and choosing incorrectly would cause rework.

Ask one neutral, answerable question at a time. Briefly explain the specific decision it resolves. Do not ask the user to choose routine implementation mechanics that can be inferred from the existing codebase. Continue the clarification loop until the scope and technical behaviour are sufficiently clear to produce tasks.

## Output

Follow the user's example breakdowns when available. Otherwise, use this compact format:

### US-## — Story name

**Scope:** One-sentence summary of the behaviour being delivered.

1. **Task title** — Estimate: 0.5–2 days
   - **Deliverable:** Concrete code or behaviour the developer will produce.
   - **Acceptance checks:** Observable completion conditions, including relevant tests.
   - **Depends on:** Earlier task IDs or story dependencies, if any.

Repeat for each task. Estimates should be per task, not a range. End with material assumptions, external blockers, or story dependencies only when relevant. Keep tasks technical and actionable; avoid vague items such as “implement the feature” or standalone testing tasks that have no defined scope.