# Requirements Specification — Collaborative Whiteboard + Markdown App

*Living document. Functional requirements derived from 02-use-cases.md.*

---

## Functional Requirements

**Priority key:** Must (MVP-blocking) / Should (MVP, lower priority) / Could (nice-to-have, MVP if time allows)

### Account & Vault Management

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-001 | Users can use the app anonymously with local-only browser storage, no account required | Must | UC-01 | Browser storage API | Browser supports required local storage |
| FR-002 | Users can create an account, with optional migration of local anonymous data to the cloud | Must | UC-02 | FR-001 | — |
| FR-003 | Users can log in to an existing account; if local anonymous data exists on the browser, the system offers to merge it into the account | Must | UC-03 | FR-002 | — |
| FR-004 | Users (anonymous or authenticated) can create multiple separate vaults | Must | UC-04 | — | — |
| FR-005 | Users can switch between their vaults | Must | UC-05 | FR-004 | — |
| FR-006 | Users can permanently delete a vault and all its contents; zero vaults is a valid account state | Must | UC-06 | FR-004 | — |

### File & Folder Management

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-007 | Users can create folders within a vault | Must | UC-07 | FR-004 | — |
| FR-008 | Users can create a new Note file; duplicate names at the same level are auto-suffixed, never blocked | Must | UC-08 | FR-007 | — |
| FR-009 | Users can create a new Canvas file; duplicate names at the same level are auto-suffixed, never blocked | Must | UC-09 | FR-007 | — |
| FR-010 | Users can rename any file/folder; underlying links never break (stable-ID based); user is optionally prompted to update the visible label text on affected links | Must | UC-10 | FR-008, FR-009 | Link storage uses stable hidden IDs, not names/paths |
| FR-011 | Users can move a file to a different folder; links are unaffected regardless of move (ID-based); moving into a folder with a name collision is blocked, requiring manual rename first | Must | UC-11 | FR-007 | — |
| FR-012 | Users can delete a note; if other content links to it, a dependent-aware confirmation is shown before deletion | Must | UC-12 | FR-008 | — |
| FR-013 | Users can delete a canvas; if other content links to it, a dependent-aware confirmation is shown before deletion | Must | UC-13 | FR-009 | — |
| FR-014 | Users can delete a folder and its full contents; a single consolidated dependent-aware confirmation covers everything inside it | Must | UC-14 | FR-012, FR-013 | — |

### Canvas Editing

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-015 | Users can add a text element to a canvas via direct double-click, with no intermediate dialog | Must | UC-15 | FR-009 | — |
| FR-016 | Users can add basic shapes to a canvas | Must | UC-16 | FR-009 | — |
| FR-017 | Users can add sticky note elements to a canvas | Must | UC-17 | FR-009 | — |
| FR-018 | Users can draw connectors/arrows between points or elements; connectors are purely visual and create no semantic/data relationship | Must | UC-18 | FR-015, FR-016, FR-017 | — |
| FR-019 | Users can group multiple canvas elements into a Group, an addressable link target with a stable ID; Groups cannot be nested | Must | UC-19 | FR-015–017 | — |
| FR-020 | Users can create a Frame (a visible bounded container) as an addressable link target; elements with any overlap (not just full containment) count as members; Frames cannot be nested | Must | UC-20 | FR-015–017 | — |
| FR-021 | Users can edit an existing element's content, size, or position; changes autosave and propagate live to any dependent embeds | Must | UC-21 | FR-015–017 | — |
| FR-022 | Users can delete a canvas element; if it has dependents (embeds, or Group/Frame membership), a dependent-aware confirmation is shown | Must | UC-22 | FR-015–017 | — |

### Note Editing

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-023 | Users can write and edit Markdown content in a note, with standard formatting (headers, lists, bullets, etc.) | Must | UC-24 | FR-008 | — |

### Linking & Embedding

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-024 | Users can link a canvas element to a note — either the whole note or a specific block — via a single unified picker; each element holds at most one such link; a note may be linked from many elements | Must | UC-25 | FR-010, FR-023 | Notes expose stable per-block IDs |
| FR-025 | Users can embed a live, read-only preview of a specific canvas element inside a note | Must | UC-27 | FR-015–017 | — |
| FR-026 | Users can embed a live, read-only preview of a Group or Frame inside a note; membership is dynamic — additions appear silently, removals trigger the dependent-aware confirmation | Must | UC-28 | FR-019, FR-020, FR-025 | — |
| FR-027 | Users can embed a live, read-only preview of a custom rectangular crop of a canvas, defined at the moment of embedding from within the note | Must | UC-29 | FR-025 | — |
| FR-028 | Clicking a linked canvas element (single click) navigates to its linked note/block; double-clicking edits the element instead | Must | UC-30 | FR-024 | — |
| FR-029 | Clicking a note embed navigates to and auto-frames/selects the source canvas content | Must | UC-31 | FR-025–027 | — |
| FR-030 | Users can remove a link or embed instantly, with no confirmation dialog; underlying content on both sides is preserved; undo/redo is the safety net | Must | UC-32 | FR-024–027, FR-047 | — |
| FR-031 | Embedded previews automatically reflect current source content, including when the embedding note was not open at the time of the source edit | Must | UC-33 | FR-021, FR-025–027 | — |
| FR-032 | When a link/embed target is missing, the system shows a broken-link indicator and lets the user relink to a new target or remove the reference | Must | UC-38 | FR-024–027 | — |
| FR-033 | The system supports many-to-many cardinality for embeds (any element/Group/Frame/Crop embeddable in multiple notes; a note may embed multiple sources) | Must | UC-23, UC-39, UC-40 | FR-025–027 | — |

### Search

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-034 | Users can perform full-text search across notes and canvas element text within the currently open vault; results show context and location; embedded content matches appear only under their source canvas, never duplicated under embedding notes | Must | UC-41 | FR-004 | — |

### Export / Import

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-035 | Users can export a single note or canvas as a downloadable file; outgoing links are preserved as standard (non-functional) Markdown links | Should | UC-42 | FR-008, FR-009 | Exact export file format is an architecture-phase decision |
| FR-036 | Users can export an entire vault as a portable bundle, with all internal links remaining fully functional within it | Should | UC-43 | FR-035 | — |
| FR-037 | Users can import loose files into the currently open vault, or import a full vault bundle to create a brand-new vault; naming collisions are blocked, requiring manual rename | Should | UC-44 | FR-011, FR-036 | — |

### Persistence

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-038 | The system continuously autosaves all edits with a short debounce; failed cloud saves are queued locally and retried, with a non-blocking status indicator | Must | UC-45 | — | — |
| FR-039 | Users can manually trigger an explicit save, receiving a brief confirmation | Should | UC-46 | FR-038 | — |

### Editing Aids

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-040 | Users can undo/redo their recent actions within the current editing session | Should *(explicitly deprioritized by product owner)* | UC-47 | — | Does not need to persist across sessions/reloads |

---

### Baseline Interactions
*(Added after a completeness check — see 02-use-cases.md Section I.)*

| ID | Description | Priority | Source (UC) | Dependencies | Assumptions |
|---|---|---|---|---|---|
| FR-041 | Users can browse the vault's file tree (expand/collapse folders) and open any note or canvas by selecting it | Must | UC-48 | FR-007–009 | — |
| FR-042 | Users can pan and zoom the canvas viewport freely to navigate large canvases | Must | UC-49 | FR-009 | — |
| FR-043 | Users can select one or more canvas elements (click, shift-click, drag-select) as targets for subsequent actions | Must | UC-50 | FR-015–017 | Drag-select uses the same partial-overlap rule as Frame membership, for consistency |

---

## Non-Functional Requirements

| ID | Category | Description | Priority |
|---|---|---|---|
| NFR-01 | Performance | The app shall support smooth interaction (canvas manipulation, note editing, navigation) at small-to-medium scale — roughly dozens to low hundreds of elements per canvas, and up to a few hundred notes/canvases per vault — without perceptible lag for a single user | Must |
| NFR-02 | Accessibility | The app shall provide a sufficient set of keyboard shortcuts for common actions (creating files, navigating, basic editing) as the primary accessibility focus for MVP | Must |
| NFR-02a | Accessibility | Broader keyboard navigation (tabbing through all UI elements, full keyboard-only operation of every workflow) is a should-have, not required for MVP | Should |
| NFR-02b | Accessibility | Screen-reader compatibility is not required for MVP | Could |
| NFR-03 | Accessibility (scope limit) | Full screen-reader parity for the canvas's spatial/visual drawing surface itself remains out of scope regardless of the above | *(Explicit scope boundary, not a gap)* |
| NFR-04 | Security | All client-server communication shall be encrypted in transit (TLS) | Must |
| NFR-05 | Security | Passwords shall be stored using industry-standard hashing (e.g. bcrypt/argon2), never in plaintext | Must |
| NFR-06 | Security / Privacy | Standard cloud-provider security and access controls are sufficient; no additional regulatory compliance certification (e.g. GDPR-specific tooling, SOC2) is required for MVP | Must |
| NFR-07 | Reliability | Autosave shall queue and retry failed saves automatically under normal network conditions, without requiring user intervention *(cross-references FR-038)* | Must |

**Recommendation:** NFR-01's exact numeric benchmarks (e.g. specific response-time targets, max element counts before degradation) should be pinned down during technical design/testing rather than fixed here — "small-to-medium" is a directionally clear but not yet measurable target.

---

## Requirements Phase: Complete

All 43 Functional Requirements and 7 Non-Functional Requirements are now specified, each traceable to a use case and (for functional ones) a corresponding user story.

