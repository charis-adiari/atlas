# Atlas - Collaborative Whiteboard & Markdown

A collaborative knowledge workspace that combines the flexibility of an infinite whiteboard with the structure and simplicity of Markdown notes.

## Table of Contents
1. [Vision](#vision)
1. [Features](#features)
1. [Architecture & Tech Stack](#architecture-and-tech-stack)
1. [Code Style Guide](#code-style-guide)

---

## Vision

The goal is to build a workspace inspired by Excalidraw and Obsidian where knowledge can be expressed in more than one way.

A user should be able to:

* Write a Markdown note and connect it to a diagram
* Create a diagram and link its elements to notes
* Navigate seamlessly between visual and written information
* Collaborate with others in a shared workspace

Rather than treating documents and drawings as separate tools, the system aims to bring them together into a connected knowledge environment.

## Features

The system is intended to support:

* An interactive, collaborative whiteboard
* Markdown-based note taking
* Links between drawings and notes
* Bidirectional relationships between visual and written content
* Connected knowledge and workspace navigation
* Real-time collaboration capabilities
* A unified experience for visual thinking and documentation

## Architecture and Tech Stack

This project is structured as a monorepo containing separate frontend and backend applications.

```text
.
├── atlas-ui/          # Frontend application
│
├── atlas-api/         # Backend application
│
├── .wiki/             # Documentation
│
└── README.md
```

The frontend and backend are maintained independently within the same repository while working together as part of the overall system.

The frontend will be built using React + NextJS. The backend will be built using Java Quarkus.

## Code Style Guide

**Scope:** These rules are binding for the entire repo including the UI and API subfolders, unless a subfolder contains its own code style guide that explicitly overrides a specific rule.

### Formatting

- **UI`:** Prettier + ESLint. Run before opening a PR as CI fails on violations.
- **API:** Formatting is handled via IDE config, provided for IntelliJ and VS Code. Use the provided config rather than your own IDE defaults.
- Do not manually override automated formatting

### Documentation Comments

- Javadoc and OpenAPI config (in the API) and TSDoc (in the UI) comments are generally required for:
  - All classes, unless inherited from an interface/abstract class that already carries the comment.
  - All non-constructor methods, including private ones unless overriding a parent interface/abstract class method that already carries the comment.
- If overridden behaviour diverges meaningfully from the parent's documented contract, add a brief note.
- No other kinds of comments should be left in code. Write code that is readable with obvious names. PRs with comments will be rejected outright.

### Code Size Limits

- **Methods:** maximum 60 lines Approaching this is a sign to extract helper methods.
- **Classes:** ideally 100–300 lines. Classes over 500 lines will have their PR rejected outright.

### Naming Conventions

- Casing generally follows the convention of the language/tool you're working in.
- **Constants:** always `SCREAMING_SNAKE_CASE`.
- **Booleans:** must start with a verb signalling yes/no - `is`, `has`, `can` (e.g. `isActive`, `hasPermission`). Do not use bare names like `active`.
- Names should not encode which subfolder they live in (no `uiUserCard`, no `apiUserService`).

### Type Safety

- **Backend:** `var` and `any`-equivalents are not allowed except in tests.
- **Frontend:** `any` is not allowed, except in tests.

### Miscellaneous

- **Folder size:** past 5 files, split a folder into subfolders by responsibility. On the other hand, 5 folders with 1 file each should be questioned.
- PRs should stay under 30 changed files Anything over 50 is as a symptom of poor planning.