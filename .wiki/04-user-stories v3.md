# User Stories — Collaborative Whiteboard + Markdown App

*Living document. Derived from 03-requirements.md (Functional Requirements) and 02-use-cases.md.*
*Effort key: S = ~1 day, M = ~2-3 days, L = ~4-5 days (solo-developer estimate, MVP scope).*
*Acceptance criteria use Given/When/Then format.*

---

## Section A: Account & Vault Management

### US-01 — Anonymous local usage
**As an** individual user, **I want** to start using the app immediately without creating an account, **so that** I can begin capturing ideas with zero friction.
- **Context:** FR-001, UC-01
- **Acceptance Criteria:**
  1. **Given** a first-time visitor with no prior session, **when** they open the app, **then** an empty local vault is initialized in browser storage.
  2. **Given** a user who has previously used the app anonymously on this browser, **when** they open the app again, **then** their existing local vault loads instead of a new one being created.
  3. **Given** browser storage is unavailable or blocked (e.g. private browsing), **when** the user opens the app, **then** a warning explains that data won't persist between sessions.
  4. **Given** local storage quota is exceeded, **when** the user attempts to save further changes, **then** a warning is shown offering export or account creation.
- **Dependencies:** None
- **Priority:** Must
- **Estimated Effort:** M

### US-02 — Create an account with automatic data migration
**As an** anonymous user, **I want** to create an account and have my local data automatically migrated to the cloud, **so that** my work is backed up and available from other devices without extra steps.
- **Context:** FR-002, UC-02
- **Acceptance Criteria:**
  1. **Given** an anonymous user, **when** they select "Create Account" and submit valid credentials, **then** an account is created.
  2. **Given** local vault data exists at the time of account creation, **when** signup completes, **then** that data is automatically migrated to the new account with no confirmation prompt.
  3. **Given** a signup attempt with a duplicate email or weak password, **when** the user submits, **then** an error is shown and the user remains anonymous.
  4. **Given** a migration is in progress, **when** the network fails partway through, **then** the system retries or rolls back, and local data is preserved as a fallback either way.
- **Dependencies:** US-01
- **Priority:** Must
- **Estimated Effort:** M

### US-03 — Log in to an existing account
**As a** registered user, **I want** to log in, **so that** I can access my vaults from any device.
- **Context:** FR-003 (partial), UC-03
- **Acceptance Criteria:**
  1. **Given** a registered user, **when** they submit valid credentials, **then** their cloud vault(s) load.
  2. **Given** a login attempt, **when** the credentials are invalid, **then** an error is shown and the user may retry.
  3. **Given** a login attempt, **when** the network fails, **then** an error is shown and the user may retry.
- **Dependencies:** US-02
- **Priority:** Must
- **Estimated Effort:** S

### US-04 — Automatically merge local data into account on login
**As a** user logging in on a browser that already has local anonymous data, **I want** that data automatically merged into my account, **so that** I don't lose work I created before logging in, without extra steps.
- **Context:** FR-003 (partial), UC-03
- **Acceptance Criteria:**
  1. **Given** local anonymous vault data exists on the browser, **when** the user logs in, **then** that data is automatically merged into the account's vault list, with no confirmation prompt.
  2. **Given** a merge is in progress, **when** the network fails partway through, **then** the system retries or rolls back, and local data is preserved as a fallback either way.
- **Dependencies:** US-03, US-02
- **Priority:** Must
- **Estimated Effort:** S

### US-05 — Create a vault
**As a** user, **I want** to create a new vault, **so that** I can separate distinct contexts of work.
- **Context:** FR-004, UC-04
- **Acceptance Criteria:**
  1. **Given** a user (anonymous or authenticated), **when** they create a vault with a valid, unique name, **then** the new empty vault appears in the vault switcher.
  2. **Given** the vault-creation form, **when** the user submits an empty or duplicate name, **then** a validation error is shown and no vault is created.
- **Dependencies:** US-01
- **Priority:** Must
- **Estimated Effort:** S

### US-06 — Switch between vaults
**As a** user with multiple vaults, **I want** to switch between them, **so that** I can move between different contexts of work.
- **Context:** FR-005, UC-05
- **Acceptance Criteria:**
  1. **Given** a user with 2+ vaults, **when** they select a different vault from the switcher, **then** that vault's file tree loads in the main view.
  2. **Given** a vault-switch attempt, **when** the target vault fails to load, **then** an error is shown and the user remains on their current vault.
- **Dependencies:** US-05
- **Priority:** Must
- **Estimated Effort:** S

### US-07 — Delete a vault
**As a** user, **I want** to permanently delete a vault, **so that** I can remove workspaces I no longer need.
- **Context:** FR-006, UC-06
- **Acceptance Criteria:**
  1. **Given** a user selects "Delete Vault," **when** the confirmation dialog appears, **then** it states how many notes/canvases will be permanently lost.
  2. **Given** the confirmation dialog, **when** the user confirms, **then** the vault and all its contents are permanently deleted.
  3. **Given** the confirmation dialog, **when** the user cancels, **then** no action is taken.
  4. **Given** a user deletes their only remaining vault, **when** the deletion completes, **then** they see a zero-vault empty state prompting creation of a new one.
- **Dependencies:** US-05
- **Priority:** Must
- **Estimated Effort:** S

---

## Section B: File & Folder Management

### US-08 — Create a folder
**As a** user, **I want** to create folders, **so that** I can organize my notes and canvases.
- **Context:** FR-007, UC-07
- **Acceptance Criteria:**
  1. **Given** a user viewing a vault (at root or within a folder), **when** they create a folder with a valid name, **then** it appears in the file tree at that location.
  2. **Given** the folder-creation form, **when** the user submits an empty name or one duplicating a sibling, **then** a validation error is shown.
- **Dependencies:** US-05
- **Priority:** Must
- **Estimated Effort:** S

### US-09 — Create a Note file
**As a** user, **I want** to create a new Markdown note, **so that** I can start organizing my thoughts in structured form.
- **Context:** FR-008, UC-08
- **Acceptance Criteria:**
  1. **Given** a user viewing a vault, **when** they select "New Note," **then** an empty Note is created and opened for editing immediately, with no dialog.
  2. **Given** a name collision with an existing file at the same folder level, **when** a new Note is created, **then** the system auto-suffixes the name rather than blocking creation.
- **Dependencies:** US-08
- **Priority:** Must
- **Estimated Effort:** S

### US-10 — Create a Canvas file
**As a** user, **I want** to create a new canvas, **so that** I can start capturing unstructured ideas visually.
- **Context:** FR-009, UC-09
- **Acceptance Criteria:**
  1. **Given** a user viewing a vault, **when** they select "New Canvas," **then** an empty Canvas is created and opened immediately, with no onboarding or dialog.
  2. **Given** a name collision with an existing file at the same folder level, **when** a new Canvas is created, **then** the system auto-suffixes the name rather than blocking creation.
- **Dependencies:** US-08
- **Priority:** Must
- **Estimated Effort:** S

### US-11 — Rename a file or folder without breaking links
**As a** user, **I want** to rename files and folders freely, **so that** I can reorganize without worrying about breaking my links.
- **Context:** FR-010, UC-10
- **Acceptance Criteria:**
  1. **Given** a file or folder, **when** the user renames it, **then** its display name updates.
  2. **Given** a renamed file has existing links/embeds pointing to it, **when** the rename completes, **then** all those links continue to function (stable-ID based, not name-based).
  3. **Given** a renamed file has incoming links, **when** the rename completes, **then** the user is prompted to optionally update the visible label text at each link occurrence.
  4. **Given** the label-update prompt, **when** the user declines, **then** the old label text remains displayed, but the link itself still works.
  5. **Given** a rename attempt, **when** the new name is empty or duplicates a sibling name, **then** the rename is rejected with a validation error.
- **Dependencies:** US-09, US-10
- **Priority:** Must
- **Estimated Effort:** M

### US-12 — Move a file to a different folder
**As a** user, **I want** to move files between folders, **so that** I can reorganize my vault's structure.
- **Context:** FR-011, UC-11
- **Acceptance Criteria:**
  1. **Given** a file and a target folder without a naming conflict, **when** the user moves the file, **then** it appears under the new parent folder and all links remain functional.
  2. **Given** a target folder already contains a file with the same name, **when** the user attempts the move, **then** it is blocked with a validation error requiring manual rename first.
- **Dependencies:** US-08
- **Priority:** Must
- **Estimated Effort:** S

### US-13 — Delete a note
**As a** user, **I want** deleting a note to be quick when nothing depends on it, but give me a choice about links when something does, **so that** I stay in control without unnecessary friction.
- **Context:** FR-012, UC-12
- **Acceptance Criteria:**
  1. **Given** a note with no incoming links, **when** the user deletes it, **then** it is deleted immediately with no confirmation prompt.
  2. **Given** a note with one or more incoming links, **when** the user attempts to delete it, **then** a prompt asks whether to remove those links (with no count or location shown) — and the note is deleted regardless of the answer.
  3. **Given** that prompt, **when** the user chooses to remove the links, **then** each link is removed; if a link had visible display text, that text remains as plain content but the link itself is gone.
  4. **Given** that prompt, **when** the user chooses not to remove the links, **then** the links remain in place but now show a broken-link state.
- **Dependencies:** US-09
- **Priority:** Must
- **Estimated Effort:** M

### US-14 — Delete a canvas
**As a** user, **I want** deleting a canvas to follow the same simple rule as deleting a note, **so that** the behavior is predictable everywhere.
- **Context:** FR-013, UC-13
- **Acceptance Criteria:**
  1. **Given** a canvas with no incoming links/embeds, **when** the user deletes it, **then** it is deleted immediately with no confirmation prompt.
  2. **Given** a canvas with one or more incoming links/embeds, **when** the user attempts to delete it, **then** a prompt asks whether to remove those links (with no count or location shown) — and the canvas is deleted regardless of the answer.
  3. **Given** that prompt, **when** the user chooses to remove the links, **then** each link/embed is removed; if a link had visible display text, that text remains as plain content but the link itself is gone.
  4. **Given** that prompt, **when** the user chooses not to remove the links, **then** the links/embeds remain in place but now show a broken-link state.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** M

### US-15 — Delete a folder
**As a** user, **I want** deleting a folder to follow the same link-handling rule as deleting individual files, **so that** the behavior stays consistent and predictable.
- **Context:** FR-014, UC-14
- **Acceptance Criteria:**
  1. **Given** a folder whose contents have no incoming links, **when** the user deletes it, **then** the folder and its contents are deleted immediately with no confirmation prompt.
  2. **Given** a folder whose contents have one or more incoming links, **when** the user attempts to delete it, **then** a single prompt asks whether to remove those links (with no count or location shown) — and the folder is deleted regardless of the answer.
  3. **Given** that prompt, **when** the user chooses to remove the links, **then** all affected links are removed; any visible display text remains as plain content but the links themselves are gone.
  4. **Given** that prompt, **when** the user chooses not to remove the links, **then** the links remain in place but now show a broken-link state.
- **Dependencies:** US-13, US-14
- **Priority:** Must
- **Estimated Effort:** M

---

## Section C: Canvas Editing

### US-16 — Add a text element via direct interaction
**As a** user, **I want** to double-click a blank canvas and start typing immediately, **so that** nothing gets between me and capturing a thought.
- **Context:** FR-015, UC-15
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user double-clicks a blank area, **then** a new text element is created at that position, ready for input, with no dialog.
  2. **Given** a newly created text element, **when** the user clicks away without typing anything, **then** the empty element is discarded.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-17 — Add a shape
**As a** user, **I want** to add basic shapes to a canvas, **so that** I can visually organize or highlight ideas.
- **Context:** FR-016, UC-16
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user selects a shape tool and clicks/drags to place it, **then** a shape element is created.
  2. **Given** a shape is drawn with negligible size (e.g. an accidental click), **when** the user releases, **then** the shape is discarded or given a sensible minimum default size.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-18 — Add a sticky note
**As a** user, **I want** to add sticky notes to a canvas, **so that** I have a visually distinct way to capture short ideas.
- **Context:** FR-017, UC-17
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user places a sticky note, **then** it's created ready for text input.
  2. **Given** a newly created sticky note, **when** the user clicks away without typing anything, **then** the empty sticky note is discarded.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-19 — Draw connectors between elements
**As a** user, **I want** to draw arrows between ideas on a canvas, **so that** I can visually show relationships while brainstorming.
- **Context:** FR-018, UC-18
- **Acceptance Criteria:**
  1. **Given** the connector tool is active, **when** the user drags from one element to another, **then** an arrow is created, anchored to both.
  2. **Given** a connector is anchored to an element, **when** that element is moved, **then** the connector moves with it.
  3. **Given** the connector tool is active, **when** the user drags from an element to empty canvas space, **then** the far end of the connector is left unanchored at that point.
  4. **Given** two connected elements, **when** a connector is drawn between them, **then** no semantic or data relationship is created between the elements — the connector is purely visual.
- **Dependencies:** US-16, US-17
- **Priority:** Must
- **Estimated Effort:** M

### US-20 — Group canvas elements
**As a** user, **I want** to group multiple elements together, **so that** I can later link/embed them as a single unit.
- **Context:** FR-019, UC-19
- **Acceptance Criteria:**
  1. **Given** 2 or more elements are selected, **when** the user triggers "Group," **then** a Group entity is created with a stable ID referencing those elements.
  2. **Given** an existing Group, **when** the user adds or removes an element from it, **then** the Group's membership updates accordingly.
  3. **Given** an element already belongs to a Group, **when** the user attempts to add it to another Group, **then** the action is prevented — Groups cannot be nested.
- **Dependencies:** US-16, US-17, US-19
- **Priority:** Must
- **Estimated Effort:** M

### US-21 — Create a Frame around elements
**As a** user, **I want** to draw a visible frame around related elements, **so that** I have a clear visual grouping I can also link/embed.
- **Context:** FR-020, UC-20
- **Acceptance Criteria:**
  1. **Given** the Frame tool is active, **when** the user draws a rectangular region, **then** a Frame entity with a stable ID is created, with a plain background and no border by default.
  2. **Given** an element only partially overlaps a Frame's boundary, **when** membership is evaluated, **then** it counts as a member (full containment is not required).
  3. **Given** an existing Frame, **when** the user resizes it, moves it, or drags an element in or out of its boundary, **then** membership updates automatically.
  4. **Given** an existing Frame, **when** the user attempts to nest another Frame or a Group inside it, **then** the action is prevented.
- **Dependencies:** US-16, US-17, US-19
- **Priority:** Must
- **Estimated Effort:** M

### US-22 — Edit an existing canvas element
**As a** user, **I want** to edit an element's content, size, or position, **so that** I can refine my canvas as my thinking evolves.
- **Context:** FR-021, UC-21
- **Acceptance Criteria:**
  1. **Given** an existing element, **when** the user selects/double-clicks it and modifies its content, size, or position, **then** the changes autosave.
  2. **Given** an element is embedded live in one or more notes, **when** its content is edited, **then** every embed referencing it reflects the update automatically.
- **Dependencies:** US-16, US-17, US-19
- **Priority:** Must
- **Estimated Effort:** M

### US-23 — Delete a canvas element
**As a** user, **I want** deleting an element to follow the same simple link rule as deleting files, **so that** cleanup stays predictable and low-friction.
- **Context:** FR-022, UC-22
- **Acceptance Criteria:**
  1. **Given** an element with no dependents, **when** the user deletes it, **then** it's removed immediately with no confirmation prompt.
  2. **Given** an element with dependents (embeds referencing it, or links pointing from it), **when** the user attempts to delete it, **then** a prompt asks whether to remove those links (with no count or location shown) — and the element is deleted regardless of the answer.
  3. **Given** that prompt, **when** the user chooses to remove the links, **then** each link/embed is removed; any visible display text remains as plain content but the link itself is gone.
  4. **Given** that prompt, **when** the user chooses not to remove the links, **then** they remain in place but now show a broken-link state.
  5. **Given** the element belonged to a Group or Frame, **when** it is deleted, **then** its membership is cleared regardless of the link-prompt answer.
- **Dependencies:** US-16, US-17, US-19
- **Priority:** Must
- **Estimated Effort:** M

---

## Section D: Note Editing

### US-24 — Write and edit Markdown content
**As a** user, **I want** to write standard Markdown (headers, lists, bullets, etc.), **so that** I can organize my thoughts once clarity has emerged.
- **Context:** FR-023, UC-24
- **Acceptance Criteria:**
  1. **Given** an open note, **when** the user types standard Markdown syntax, **then** it renders with correct formatting.
  2. **Given** a note is being edited, **when** the user makes changes, **then** the content autosaves continuously.
  3. **Given** malformed or unclosed Markdown syntax (e.g. an unclosed code block), **when** the user continues typing, **then** editing is not blocked.
- **Dependencies:** US-09
- **Priority:** Must
- **Estimated Effort:** M

---

## Section E: Linking & Embedding

### US-25 — Link a canvas element to a note or block
**As a** user, **I want** to link a canvas element to a note (or a specific block within it), **so that** I can navigate from my brainstorm directly to its organized write-up.
- **Context:** FR-024, UC-25
- **Acceptance Criteria:**
  1. **Given** a canvas element is selected, **when** the user triggers "Link to Note," **then** a single picker opens offering both whole-note and specific-block targets.
  2. **Given** the picker is open, **when** the user types text into it, **then** results filter to notes whose name matches the query.
  3. **Given** the picker is open, **when** the user selects a note (and optionally a specific block within it), **then** a link is created referencing that target's stable ID.
  4. **Given** a canvas element already has a link, **when** the user attempts to add another, **then** the existing link must be replaced or removed first — one target per element.
  5. **Given** a note already has one linking canvas element, **when** a different canvas element is linked to the same note, **then** the link is created with no restriction.
  6. **Given** a link is successfully created, **when** the canvas is viewed, **then** the linked element shows a visual "linked" indicator.
  7. **Given** the picker is open, **when** the user cancels, **then** no link is created.
- **Dependencies:** US-16, US-17, US-19, US-24
- **Priority:** Must
- **Estimated Effort:** L

### US-26 — Quick-create a note while linking
**As a** user, **I want** to create a brand-new note directly from the linking picker, **so that** I don't have to break my flow to go create one first.
- **Context:** FR-024 (alt flow), UC-25
- **Acceptance Criteria:**
  1. **Given** the note picker is open, **when** the user selects "create new note," **then** an empty note is created.
  2. **Given** a note was just quick-created from the picker, **when** creation completes, **then** the canvas element is immediately linked to it (whole-note).
- **Dependencies:** US-25
- **Priority:** Should
- **Estimated Effort:** S

### US-27 — Handle removal of a linked block during normal editing
**As a** user, **I want** normal note editing to never be blocked, even when it touches a linked block, **so that** writing stays frictionless while I still get a say in what happens to the link.
- **Context:** FR-024 (exception), UC-25 (E3)
- **Acceptance Criteria:**
  1. **Given** a note block with no incoming links, **when** the user's edit removes it, **then** the edit applies immediately with no prompt.
  2. **Given** a note block linked from a canvas element, **when** the user's edit would remove that block, **then** a prompt asks whether to remove the link (with no count or location shown) — and the edit proceeds regardless of the answer.
  3. **Given** that prompt, **when** the user chooses to remove the link, **then** the canvas element's link is removed; any visible display text on it remains as plain content but the link itself is gone.
  4. **Given** that prompt, **when** the user chooses not to remove the link, **then** the link remains but now shows a broken-link state.
- **Dependencies:** US-25
- **Priority:** Must
- **Estimated Effort:** M

### US-28 — Embed a live preview of a single canvas element
**As a** user, **I want** to embed a live preview of a canvas element inside a note, **so that** I don't have to retype content or maintain two copies.
- **Context:** FR-025, UC-27
- **Acceptance Criteria:**
  1. **Given** the cursor is placed in a note, **when** the user triggers "Embed" and selects a canvas element, **then** an embed block is inserted referencing that element's stable ID.
  2. **Given** an embed block exists, **when** the note is viewed, **then** it renders a live, read-only preview of the element's current content.
  3. **Given** a canvas element, **when** it is embedded in multiple different notes, **then** all embeds are created with no restriction.
  4. **Given** a single note, **when** the user embeds multiple elements from multiple different canvases, **then** all embeds are created with no restriction.
  5. **Given** the embed picker is open, **when** the user cancels, **then** no embed is created.
- **Dependencies:** US-16, US-17, US-19, US-24
- **Priority:** Must
- **Estimated Effort:** L

### US-29 — Embed a live preview of a Group or Frame
**As a** user, **I want** to embed a Group or Frame of related elements as one preview, **so that** I can show a whole cluster of ideas at once in my notes.
- **Context:** FR-026, UC-28
- **Acceptance Criteria:**
  1. **Given** the embed picker is open, **when** the user selects a Group or Frame instead of a single element, **then** the embed renders all current members together.
  2. **Given** an already-embedded Group/Frame, **when** a new element is added to it, **then** the embedded preview updates silently, with no confirmation.
  3. **Given** an already-embedded Group/Frame, **when** a member is removed from it, **then** the embedded preview updates silently to reflect the new membership, with no confirmation — the Group/Frame itself still exists, so nothing is broken.
- **Dependencies:** US-20, US-21, US-28
- **Priority:** Must
- **Estimated Effort:** M

### US-30 — Embed a viewport-crop preview
**As a** user, **I want** to embed just a specific region of a busy canvas, **so that** I can show relevant context without needing to Group/Frame it first.
- **Context:** FR-027, UC-29
- **Acceptance Criteria:**
  1. **Given** the embed picker is open, **when** the user chooses "Define custom region" and selects a canvas, **then** a view opens allowing the user to drag out a rectangle.
  2. **Given** the user confirms a crop rectangle, **when** the embed is created, **then** a Crop entity with a stable ID is stored and the embed renders whatever content currently falls within that rectangle.
  3. **Given** an existing crop embed, **when** the user reopens and adjusts its position/size from within the note, **then** the crop bounds update accordingly.
  4. **Given** a crop region, **when** all canvas content within it is later moved or deleted, **then** the preview simply renders empty, with no error state.
  5. **Given** the crop-drawing view is open, **when** the user cancels, **then** no embed is created.
- **Dependencies:** US-28
- **Priority:** Must
- **Estimated Effort:** L

### US-31 — Navigate from a linked canvas element to its note
**As a** user, **I want** to click a linked canvas element to jump to its note, **so that** I can move quickly between my visual and structured thinking.
- **Context:** FR-028, UC-30
- **Acceptance Criteria:**
  1. **Given** a linked canvas element, **when** the user clicks it, **then** the target note opens, scrolling to and highlighting the specific block if the link targets one.
  2. **Given** a user wants to edit a linked element instead of navigating, **when** they use the appropriate keyboard interaction (rather than clicking), **then** the element becomes editable — clicking itself always navigates and never toggles editing.
  3. **Given** a link that never resolved to anything (e.g. a typed/shorthand reference to a note or canvas that was never created), **when** the user clicks it, **then** a new note/canvas with that name is created automatically and the link now points to it.
  4. **Given** a link whose target was deliberately deleted (the whole note/canvas, per US-13/14's "keep broken" choice) — or whose outer note/canvas exists but whose specific target block/element inside it is missing — **when** the user clicks it, **then** a broken-link message is shown instead of navigating or auto-creating.
- **Dependencies:** US-25
- **Priority:** Must
- **Estimated Effort:** M

### US-32 — Interact with an embed, or navigate to its source
**As a** user, **I want** to interact directly with an embedded preview (like panning/zooming a cropped canvas view), **so that** I can explore it without leaving my note — and still be able to jump to the source when I need to edit it.
- **Context:** FR-029, UC-31
- **Acceptance Criteria:**
  1. **Given** a note embed, **when** the user clicks and interacts with it (e.g. panning/zooming within a viewport-crop preview), **then** the interaction happens in place, within the note, without navigating away.
  2. **Given** a note embed, **when** the user double-clicks it, **then** the source canvas opens with the viewport automatically panned/zoomed to fit and select the referenced content.
  3. **Given** a note embed whose source no longer exists, **when** the user double-clicks it, **then** a broken-link indicator is shown instead of navigating.
- **Dependencies:** US-28, US-29, US-30
- **Priority:** Must
- **Estimated Effort:** M

### US-33 — Remove a link or embed instantly
**As a** user, **I want** to remove a link or embed without extra confirmation, **so that** cleaning up references stays lightweight (I can always undo).
- **Context:** FR-030, UC-32
- **Acceptance Criteria:**
  1. **Given** an existing link or embed, **when** the user triggers "Remove Link"/"Unlink," **then** the reference is removed instantly with no confirmation dialog.
  2. **Given** a link/embed was just removed, **when** the underlying content on both sides is checked, **then** it remains fully intact and unaffected.
  3. **Given** a link/embed was just removed, **when** the user triggers undo, **then** the link/embed is restored.
- **Dependencies:** US-25, US-28, US-29, US-30
- **Priority:** Must
- **Estimated Effort:** S

### US-34 — Live auto-update of embedded previews
**As a** user, **I want** my note embeds to always reflect the current state of the canvas, **so that** I never see stale, out-of-date information.
- **Context:** FR-031, UC-33
- **Acceptance Criteria:**
  1. **Given** a note with an open embed of a canvas element, **when** that element is edited elsewhere, **then** the open note view updates automatically without a manual refresh.
  2. **Given** an embedding note is not currently open, **when** the source element is edited, **then** the update is persisted and shown the next time that note is opened.
- **Dependencies:** US-22, US-28
- **Priority:** Must
- **Estimated Effort:** M

### US-35 — Resolve a broken link
**As a** user, **I want** to relink or remove a broken reference, **so that** I can clean up my vault after deleting something that was still linked.
- **Context:** FR-032, UC-38
- **Acceptance Criteria:**
  1. **Given** a link/embed whose target has been deleted, **when** the content is viewed, **then** a distinct broken-link indicator is shown.
  2. **Given** a broken-link indicator, **when** the user interacts with it, **then** they are offered "Relink" (opens the standard picker) or "Remove" (deletes the reference instantly, per US-33).
  3. **Given** a broken link is left untouched, **when** the user continues working, **then** it persists indefinitely with no forced resolution.
- **Dependencies:** US-25, US-28, US-33
- **Priority:** Must
- **Estimated Effort:** M

---

## Section F: Search

### US-36 — Search across notes and canvas elements
**As a** user, **I want** to search across my vault's notes and canvas text, **so that** I can quickly find something I remember writing.
- **Context:** FR-034, UC-41
- **Acceptance Criteria:**
  1. **Given** the search bar, **when** the user enters a query, **then** results include matches from both Markdown note content and canvas element text (text, sticky notes, shape labels).
  2. **Given** a user has multiple vaults, **when** they search, **then** results are limited to the currently open vault only.
  3. **Given** search results, **when** they are displayed, **then** each shows a context snippet and file location.
  4. **Given** a search result, **when** the user selects it, **then** the app navigates there and highlights the match.
  5. **Given** a canvas element embedded in a note matches the query, **when** results are shown, **then** the match appears only under the source canvas, never duplicated under the embedding note.
  6. **Given** a query with no matches, **when** search completes, **then** a clear empty state is shown.
- **Dependencies:** US-09, US-10, US-16, US-17, US-18, US-24
- **Priority:** Must
- **Estimated Effort:** L

---

## Section G: Export / Import

> **Note:** Single note/canvas export (previously US-37) has been removed — export is vault-only.

### US-38 — Export an entire vault as a ZIP
**As a** user, **I want** to export my whole vault as a single ZIP file, **so that** I have a complete, portable backup I can store or move elsewhere.
- **Context:** FR-036, UC-43
- **Acceptance Criteria:**
  1. **Given** a vault, **when** the user triggers "Export Vault," **then** all notes/canvases are bundled together into a single downloadable ZIP file, preserving folder structure.
  2. **Given** the exported ZIP, **when** it's opened or imported elsewhere, **then** all internal links/embeds remain fully functional.
- **Dependencies:** None
- **Priority:** Should
- **Estimated Effort:** M

### US-39 — Import files or a vault bundle
**As a** user, **I want** to import files or a previously exported vault, **so that** I can restore my work or bring in outside content.
- **Context:** FR-037, UC-44
- **Acceptance Criteria:**
  1. **Given** the user imports loose files, **when** the import completes, **then** the files are added to the currently open vault.
  2. **Given** the user imports a vault bundle (a ZIP file matching the export format), **when** the import completes, **then** a brand-new vault is created for it.
  3. **Given** imported content has a naming collision with existing content, **when** the import runs, **then** it is blocked, requiring manual rename first.
  4. **Given** a partial import references content that isn't included, **when** the import completes, **then** the missing reference results in a normal broken-link state.
- **Dependencies:** US-38, US-12
- **Priority:** Should
- **Estimated Effort:** L

---

## Section H: Persistence

### US-40 — Continuous autosave
**As a** user, **I want** my work saved automatically as I go, **so that** I never lose progress or have to think about saving.
- **Context:** FR-038, UC-45
- **Acceptance Criteria:**
  1. **Given** the user makes an edit, **when** a short debounce period elapses, **then** the change is persisted with no visible interruption.
  2. **Given** a cloud autosave attempt, **when** the network fails, **then** the change is queued locally, retried automatically, and a subtle, non-blocking indicator is shown.
  3. **Given** local storage quota is exceeded, **when** autosave attempts to persist, **then** the same warning as US-01 is surfaced.
- **Dependencies:** US-01, US-02
- **Priority:** Must
- **Estimated Effort:** M

### US-41 — Manual save
**As a** user, **I want** an explicit "Save" action, **so that** I have reassurance my work is safely stored, even with autosave running.
- **Context:** FR-039, UC-46
- **Acceptance Criteria:**
  1. **Given** the user is editing content, **when** they trigger manual save (shortcut or button), **then** the current state is persisted immediately.
  2. **Given** a manual save succeeds, **when** it completes, **then** a brief confirmation (e.g. a "Saved" toast) is shown.
  3. **Given** a manual save attempt, **when** it fails (e.g. network issue), **then** an error is shown and the save is retried automatically.
- **Dependencies:** US-40
- **Priority:** Should
- **Estimated Effort:** S

---

## Editing Aids

### US-42 — Undo/redo within a session
**As a** user, **I want** to undo/redo my recent actions, **so that** I can recover quickly from mistakes while editing.
- **Context:** FR-040, UC-47
- **Acceptance Criteria:**
  1. **Given** a recent action on a canvas or in a note, **when** the user triggers undo, **then** that action is reverted.
  2. **Given** an action was just undone, **when** the user triggers redo, **then** the action is reapplied.
  3. **Given** the app is reloaded, **when** the user checks undo history, **then** no persistence across reloads/sessions is required.
- **Dependencies:** None
- **Priority:** Should *(explicitly deprioritized by product owner relative to other work)*
- **Estimated Effort:** L *(often underestimated — needs a consistent action-history model across both canvas and note editors)*

---

## Baseline Interactions
*(Added after a completeness check — these were assumed as preconditions throughout every other section but never specified on their own.)*

### US-43 — Browse and open files from the file tree
**As a** user, **I want** to browse my vault's folder tree and open any note or canvas, **so that** I can access my existing content.
- **Context:** FR-041, UC-48
- **Acceptance Criteria:**
  1. **Given** a vault with folders and files, **when** the user expands or collapses a folder, **then** its contents show or hide accordingly.
  2. **Given** the file tree, **when** the user clicks a note or canvas, **then** its content loads into the main content area.
  3. **Given** a file's content is corrupted or fails to load, **when** the user selects it, **then** an error state is shown in the main area instead of content.
- **Dependencies:** US-08, US-09, US-10
- **Priority:** Must
- **Estimated Effort:** M

### US-44 — Pan and zoom the canvas viewport
**As a** user, **I want** to pan and zoom around a canvas, **so that** I can navigate large or busy whiteboards.
- **Context:** FR-042, UC-49
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user performs a pan gesture (drag or scroll), **then** the viewport shifts accordingly.
  2. **Given** an open canvas, **when** the user performs a zoom gesture (scroll+modifier, pinch, or zoom controls), **then** the content scales to the new zoom level.
  3. **Given** the viewport is at minimum or maximum zoom, **when** the user attempts to zoom further, **then** the zoom is clamped with no error.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-45 — Select canvas elements
**As a** user, **I want** to select one or more canvas elements, **so that** I can move, delete, group, or link them.
- **Context:** FR-043, UC-50
- **Acceptance Criteria:**
  1. **Given** an open canvas with elements, **when** the user clicks a single element, **then** it becomes selected and visually highlighted.
  2. **Given** an open canvas, **when** the user drag-selects (rubber-band) over an area, **then** all elements overlapping that area become selected.
  3. **Given** one element is already selected, **when** the user shift-clicks another element, **then** it is added to the current selection.
  4. **Given** one or more elements are selected, **when** the user clicks blank canvas space, **then** the selection is cleared.
- **Dependencies:** US-16, US-17, US-18
- **Priority:** Must
- **Estimated Effort:** S

---

## Traceability Note

Every story above maps to exactly one Functional Requirement and one or more Use Cases, except **FR-033** (many-to-many cardinality), which is intentionally not a standalone story — it's expressed as acceptance criteria within US-25, US-28, US-29, and US-30 instead, since cardinality isn't a user-facing action on its own.
