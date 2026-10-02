# User Stories — Collaborative Whiteboard + Markdown App

*Living document. Derived from 03-requirements.md (Functional Requirements) and 02-use-cases.md.*
*Effort key: S = ~1 day, M = ~2-3 days, L = ~4-5 days (solo-developer estimate, MVP scope).*
*Acceptance criteria use Given/When/Then format.*

---

## Section A: Account & Vault Management

### US-01 — Anonymous local usage
**As an** individual user, **I want** to start using the app immediately without creating an account, **so that** I can begin capturing ideas with zero friction.
- **Context:**
  Preconditions: User opens the app in a supported browser; no active login session  
  1. User opens the app  
  2. System detects no existing session/account  
  3. System initialises a local, empty vault stored in browser storage  
     3.1. Alternatively, the user has used the app anonymously before on this browser → system loads existing local vault instead of creating a new one  
  4. User sees an empty file tree (empty state)  
  5. User creates files/folders; all data persists only to browser local storage  
     5.1. If browser storage unavailable/blocked (e.g. private browsing) → system warns that data won't persist between sessions  
     5.2. If local storage quota exceeded → system warns and offers export or account creation  
  6. User has an active local-only vault, persisted across sessions in that browser unless storage is cleared

  Links to FR-001
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
- **Context:**
  Preconditions: User has been using the app anonymously (local data may or may not exist)  
  1. User selects "Create Account"  
  2. System prompts for signup credentials  
  3. User submits valid credentials; system creates the account  
     3.1. If signup fails (duplicate email, weak password, etc.) → error shown, user remains anonymous  
  4. System detects existing local vault data and prompts to migrate it  
  5. User confirms migration  
     5.1. Alternatively, the user declines migration → account created, but local data stays local-only and is not tied to the account  
  6. System uploads local vault data to the cloud, associated with the new account  
     6.1. If migration fails partway (network failure) → system retries or rolls back, notifies user, local data is preserved as fallback either way  
  7. User is authenticated; local vault data optionally migrated to the cloud

  Links to FR-002
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
- **Context:**
  Preconditions: User has a registered account  
  1. User selects "Log In" and enters credentials  
  2. System authenticates the user  
     2.1. If invalid credentials → error shown, retry allowed  
     2.2. If network failure during login → error shown, retry allowed  
  3. System loads the user's vault(s) from the cloud  
     3.1. Alternatively, local anonymous data exists on this browser at time of login → system prompts the user to merge that local data into the account. If confirmed, local vault(s) are uploaded and added to the account's vault list (see US-04)  
  4. User is authenticated and viewing their cloud vault(s); any local anonymous data has been merged in if confirmed

  Links to FR-003 (partial)
- **Acceptance Criteria:**
  1. **Given** a registered user, **when** they submit valid credentials, **then** their cloud vault(s) load.
  2. **Given** a login attempt, **when** the credentials are invalid, **then** an error is shown and the user may retry.
  3. **Given** a login attempt, **when** the network fails, **then** an error is shown and the user may retry.
- **Dependencies:** US-02
- **Priority:** Must
- **Estimated Effort:** S

### US-04 — Automatically merge local data into account on login
**As a** user logging in on a browser that already has local anonymous data, **I want** that data automatically merged into my account, **so that** I don't lose work I created before logging in, without extra steps.
- **Context:**
  Preconditions: User has a registered account; local anonymous data exists on this browser  
  1. User selects "Log In" and enters credentials  
  2. System authenticates the user (see US-03)  
  3. System detects local anonymous data on this browser and prompts the user to merge it into the account (same merge flow as account creation, US-02 steps 4-6)  
  4. User confirms the merge  
  5. System uploads the local vault(s) and adds them to the account's vault list  
     5.1. If merge fails partway (network failure) → system retries or rolls back; local data is preserved as fallback either way  
  6. User is authenticated and viewing their cloud vault(s); local anonymous data has been merged in

  Links to FR-003 (partial)
- **Acceptance Criteria:**
  1. **Given** local anonymous vault data exists on the browser, **when** the user logs in, **then** that data is automatically merged into the account's vault list, with no confirmation prompt.
  2. **Given** a merge is in progress, **when** the network fails partway through, **then** the system retries or rolls back, and local data is preserved as a fallback either way.
- **Dependencies:** US-03, US-02
- **Priority:** Must
- **Estimated Effort:** S

### US-05 — Create a vault
**As a** user, **I want** to create a new vault, **so that** I can separate distinct contexts of work.
- **Context:**
  Preconditions: None beyond having the app open (works in both anonymous and authenticated mode; both support multiple vaults)  
  1. User selects "Create Vault" and names it  
     1.1. If vault name is empty or duplicates an existing vault name → validation error  
  2. System creates a new, empty vault under the account  
  3. User is switched into the new vault (or offered the choice)  
  4. A new empty vault exists and is accessible from the vault switcher

  Links to FR-004
- **Acceptance Criteria:**
  1. **Given** a user (anonymous or authenticated), **when** they create a vault with a valid, unique name, **then** the new empty vault appears in the vault switcher.
  2. **Given** the vault-creation form, **when** the user submits an empty or duplicate name, **then** a validation error is shown and no vault is created.
- **Dependencies:** US-01
- **Priority:** Must
- **Estimated Effort:** S

### US-06 — Switch between vaults
**As a** user with multiple vaults, **I want** to switch between them, **so that** I can move between different contexts of work.
- **Context:**
  Preconditions: User has 2+ vaults  
  1. User opens the vault switcher  
  2. User selects a different vault  
  3. System loads the selected vault's file tree  
     3.1. If vault fails to load (network/data issue) → error shown, user remains on current vault  
  4. The newly selected vault is now the active context

  Links to FR-005
- **Acceptance Criteria:**
  1. **Given** a user with 2+ vaults, **when** they select a different vault from the switcher, **then** that vault's file tree loads in the main view.
  2. **Given** a vault-switch attempt, **when** the target vault fails to load, **then** an error is shown and the user remains on their current vault.
- **Dependencies:** US-05
- **Priority:** Must
- **Estimated Effort:** S

### US-07 — Delete a vault
**As a** user, **I want** to permanently delete a vault, **so that** I can remove workspaces I no longer need.
- **Context:**
  Preconditions: Target vault exists  
  1. User selects "Delete Vault"  
  2. System shows a confirmation warning (irreversible; states how many notes/canvases will be lost)  
  3. User confirms  
     3.1. Alternatively, the user cancels at confirmation → no action taken  
  4. System permanently deletes the vault and all contained files/links  
     4.1. If the user deletes their only remaining vault → allowed. User is left with zero vaults and shown an empty state prompting them to create a new one  
  5. Vault and all its contents are permanently removed. Zero vaults is a valid state

  Links to FR-006
- **Acceptance Criteria:**
  1. **Given** a user selects "Delete Vault," **when** the confirmation dialogue appears, **then** it states how many notes/canvases will be permanently lost.
  2. **Given** the confirmation dialogue, **when** the user confirms, **then** the vault and all its contents are permanently deleted.
  3. **Given** the confirmation dialogue, **when** the user cancels, **then** no action is taken.
  4. **Given** a user deletes their only remaining vault, **when** the deletion completes, **then** they see a zero-vault empty state prompting creation of a new one.
- **Dependencies:** US-05
- **Priority:** Must
- **Estimated Effort:** S

---

## Section B: File & Folder Management

### US-08 — Create a folder
**As a** user, **I want** to create folders, **so that** I can organize my notes and canvases.
- **Context:**
  Preconditions: User is viewing a vault  
  1. User selects "New Folder" (at vault root or within an existing folder)  
  2. User names the folder  
     2.1. If folder name is empty or duplicates a sibling folder/file name at the same level → validation error  
  3. System creates the folder in the file tree  
  4. New empty folder appears in the file tree

  Links to FR-007
- **Acceptance Criteria:**
  1. **Given** a user viewing a vault (at root or within a folder), **when** they create a folder with a valid name, **then** it appears in the file tree at that location.
  2. **Given** the folder-creation form, **when** the user submits an empty name or one duplicating a sibling, **then** a validation error is shown.
- **Dependencies:** US-05
- **Priority:** Must
- **Estimated Effort:** S

### US-09 — Create a Note file
**As a** user, **I want** to create a new Markdown note, **so that** I can start organizing my thoughts in structured form.
- **Context:**
  Preconditions: User is viewing a vault (at root or within a folder)  
  1. User selects "New Note"  
     1.1. If duplicate name at the same folder level → system auto-suffixes (e.g. "Untitled 2") rather than blocking, consistent with the "get out of the way" principle  
  2. System creates an empty Note file at the current location and opens it in the main content area  
  3. User can immediately begin typing  
  4. New Note file exists and is open for editing

  Links to FR-008
- **Acceptance Criteria:**
  1. **Given** a user viewing a vault, **when** they select "New Note," **then** an empty Note is created and opened for editing immediately, with no dialogue.
  2. **Given** a name collision with an existing file at the same folder level, **when** a new Note is created, **then** the system auto-suffixes the name rather than blocking creation.
- **Dependencies:** US-08
- **Priority:** Must
- **Estimated Effort:** S

### US-10 — Create a Canvas file
**As a** user, **I want** to create a new canvas, **so that** I can start capturing unstructured ideas visually.
- **Context:**
  Preconditions: User is viewing a vault (at root or within a folder)  
  1. User selects "New Canvas"  
     1.1. If duplicate name at the same folder level → system auto-suffixes, same as US-09  
  2. System creates an empty Canvas file at the current location and opens it in the main content area (blank canvas, no onboarding)  
  3. New Canvas file exists and is open for editing

  Links to FR-009
- **Acceptance Criteria:**
  1. **Given** a user viewing a vault, **when** they select "New Canvas," **then** an empty Canvas is created and opened immediately, with no onboarding or dialogue.
  2. **Given** a name collision with an existing file at the same folder level, **when** a new Canvas is created, **then** the system auto-suffixes the name rather than blocking creation.
- **Dependencies:** US-08
- **Priority:** Must
- **Estimated Effort:** S

### US-11 — Rename a file or folder without breaking links
**As a** user, **I want** to rename files and folders freely, **so that** I can reorganize without worrying about breaking my links.
- **Context:**
  Preconditions: File or folder exists  
  1. User triggers rename (e.g. double-click name, or context menu)  
  2. User enters a new name  
     2.1. If new name is empty or duplicates a sibling name → validation error, rename not applied  
  3. System updates the display name  
  4. If the renamed file has incoming links, system prompts: "Update visible label text on N link(s) to match the new name?" (underlying connections never break regardless of the answer)  
     4.1. Alternatively, the user declines the label update → links keep functioning (via stable ID) but display the old label text  
  5. File/folder has new display name; link connections remain intact; link labels updated only if user confirmed

  Links to FR-010
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
- **Context:**
  Preconditions: File and target folder both exist  
  1. User drags (or otherwise moves) a file into a different folder  
     1.1. If target folder already contains a file with the same name → validation error, move is blocked; user must rename manually first (intentionally different from the auto-suffix behaviour on file creation)  
  2. System updates the file's location in the tree  
  3. Existing links to/from this file remain functional (stable ID based) — no prompt needed since names/paths aren't the link mechanism  
  4. File appears under its new parent folder; all links remain intact

  Links to FR-011
- **Acceptance Criteria:**
  1. **Given** a file and a target folder without a naming conflict, **when** the user moves the file, **then** it appears under the new parent folder and all links remain functional.
  2. **Given** a target folder already contains a file with the same name, **when** the user attempts the move, **then** it is blocked with a validation error requiring manual rename first.
- **Dependencies:** US-08
- **Priority:** Must
- **Estimated Effort:** S

### US-13 — Delete a note
**As a** user, **I want** deleting a note to be quick when nothing depends on it, but give me a choice about links when something does, **so that** I stay in control without unnecessary friction.
- **Context:**
  Preconditions: Note exists  
  1. User selects "Delete" on a note  
  2. System checks for incoming links (canvas elements pointing to this note, or other notes linking to it)  
  3. If no dependents exist: system deletes immediately (lightweight confirmation only, e.g. simple "Are you sure?")  
  4. If dependents exist: system shows the dependent-aware confirmation: "N canvas elements / notes link to this. Delete anyway?"  
  5. User confirms  
     5.1. Alternatively, the user cancels at confirmation → no action taken  
  6. System deletes the note; dependent links now display broken-link indicators  
  7. Note is permanently removed; any dependent links show broken-link state

  Links to FR-012
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
- **Context:**
  Preconditions: Canvas exists  
  1. User selects "Delete" on a canvas  
  2. System checks for dependents: notes embedding any element/group/frame/crop from this canvas, and any other references pointing into it  
  3. If no dependents exist: system deletes immediately (lightweight confirmation only, e.g. simple "Are you sure?")  
  4. If dependents exist: system shows the dependent-aware confirmation, e.g. "N notes embed content from this canvas. Delete anyway?"  
  5. User confirms  
     5.1. Alternatively, the user cancels at confirmation → no action taken  
  6. System deletes the canvas; all embeds sourced from it show broken-link state  
  7. Canvas is permanently removed; all embeds sourced from it show broken-link state

  Links to FR-013
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
- **Context:**
  Preconditions: Folder exists and contains one or more files/subfolders  
  1. User selects "Delete" on a folder  
     1.1. If folder is empty → simple confirmation only, no dependent-link warning needed  
  2. System recursively identifies all notes/canvases inside the folder (and subfolders) and aggregates all dependents across all of them  
  3. System shows a single consolidated confirmation: "This folder contains N notes and M canvases. Deleting it will also break P links. Delete anyway?"  
  4. User confirms  
     4.1. Alternatively, the user cancels → no action taken  
  5. System deletes the folder and everything inside it; all affected links show broken-link state  
  6. Folder and all contents permanently removed; dependent links across the whole subtree show broken-link state

  Links to FR-014
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
- **Context:**
  Preconditions: Canvas file is open  
  1. User double-clicks a blank area of the canvas  
     1.1. Alternatively, the user selects a "Text" tool from a toolbar instead of double-clicking → same result  
  2. System creates a new text element at that position, ready for input immediately — no dialog, no tool selection required  
  3. User types content  
  4. User clicks away or presses Escape to finish editing  
     4.1. If user clicks away without typing anything → the empty element is discarded, not saved, keeping the canvas clean  
  5. Canvas contains a new text element with a stable ID

  Links to FR-015
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user double-clicks a blank area, **then** a new text element is created at that position, ready for input, with no dialogue.
  2. **Given** a newly created text element, **when** the user clicks away without typing anything, **then** the empty element is discarded.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-17 — Add a shape
**As a** user, **I want** to add basic shapes to a canvas, **so that** I can visually organize or highlight ideas.
- **Context:**
  Preconditions: Canvas is open  
  1. User selects a shape tool  
  2. User clicks/drags to place and size the shape  
     2.1. If shape drawn with negligible size (accidental click) → discarded, or given a sensible minimum default size  
  3. System creates the shape element  
  4. Canvas contains a new shape element with a stable ID

  Links to FR-016
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user selects a shape tool and clicks/drags to place it, **then** a shape element is created.
  2. **Given** a shape is drawn with negligible size (e.g. an accidental click), **when** the user releases, **then** the shape is discarded or given a sensible minimum default size.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-18 — Add a sticky note
**As a** user, **I want** to add sticky notes to a canvas, **so that** I have a visually distinct way to capture short ideas.
- **Context:**
  Preconditions: Canvas is open  
  1. User selects the sticky note tool (or equivalent gesture) and places it  
  2. System creates a sticky note element, ready for text input  
  3. User types content  
     3.1. If user clicks away without typing anything → empty sticky note discarded, same as US-16  
  4. Canvas contains a new sticky note element with a stable ID

  Links to FR-017
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user places a sticky note, **then** it's created ready for text input.
  2. **Given** a newly created sticky note, **when** the user clicks away without typing anything, **then** the empty sticky note is discarded.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-19 — Draw connectors between elements
**As a** user, **I want** to draw arrows between ideas on a canvas, **so that** I can visually show relationships while brainstorming.
- **Context:**
  Preconditions: Canvas is open (elements may or may not already exist)  
  1. User selects the connector tool  
  2. User drags from a source element to a target element  
     2.1. Alternatively, the user drags from an element to empty canvas space → the far end is unanchored/floating at that point  
     2.2. Alternatively, the user drags between two empty points → a free-floating connector is created, attached to nothing  
  3. System creates an arrow anchored to both elements — it moves if either element is repositioned  
  4. Canvas contains a connector. This is purely visual — no semantic/data link is created between the connected elements

  Links to FR-018
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
- **Context:**
  Preconditions: 2+ elements exist and are selected  
  1. User selects multiple elements (e.g. shift-click or drag-select)  
  2. User triggers "Group"  
     2.1. If user attempts to group elements where one is already part of another group → action prevented (Groups/Frames are flat; nesting is not allowed)  
  3. System creates a Group entity with a stable ID, referencing the selected elements  
     3.1. Alternatively, the user adds an element to an existing group later  
     3.2. Alternatively, the user removes an element from a group  
  4. Selected elements belong to a Group, itself addressable as a link target

  Links to FR-019
- **Acceptance Criteria:**
  1. **Given** 2 or more elements are selected, **when** the user triggers "Group," **then** a Group entity is created with a stable ID referencing those elements.
  2. **Given** an existing Group, **when** the user adds or removes an element from it, **then** the Group's membership updates accordingly.
  3. **Given** an element already belongs to a Group, **when** the user attempts to add it to another Group, **then** the action is prevented — Groups cannot be nested.
- **Dependencies:** US-16, US-17, US-19
- **Priority:** Must
- **Estimated Effort:** M

### US-21 — Create a Frame around elements
**As a** user, **I want** to draw a visible frame around related elements, **so that** I have a clear visual grouping I can also link/embed.
- **Context:**
  Preconditions: Canvas is open  
  1. User selects the Frame tool  
  2. User draws a rectangular region on the canvas  
  3. Elements contained within the frame become its members (partial overlap counts as membership; an element does not need to be fully enclosed)  
     3.1. If an element only partially overlaps the frame boundary → it still counts as a member  
  4. System creates a Frame entity with a stable ID and a rendered visible border  
     4.1. Alternatively, the user resizes/moves the frame later → membership updates automatically based on containment  
     4.2. Alternatively, the user drags an element into or out of the frame boundary → membership updates automatically  
  5. Frame exists with member elements; Frame is addressable as a link target

  Links to FR-020
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
- **Context:**
  Preconditions: Element exists  
  1. User selects/double-clicks the element  
  2. User modifies content, size, or position  
  3. System autosaves the change  
  4. Any live embeds/previews elsewhere that reference this element update automatically (the canvas is the source of truth)  
  5. Element is updated; all dependent previews reflect the new state

  Links to FR-021
- **Acceptance Criteria:**
  1. **Given** an existing element, **when** the user selects/double-clicks it and modifies its content, size, or position, **then** the changes autosave.
  2. **Given** an element is embedded live in one or more notes, **when** its content is edited, **then** every embed referencing it reflects the update automatically.
- **Dependencies:** US-16, US-17, US-19
- **Priority:** Must
- **Estimated Effort:** M

### US-23 — Delete a canvas element
**As a** user, **I want** deleting an element to follow the same simple link rule as deleting files, **so that** cleanup stays predictable and low-friction.
- **Context:**
  Preconditions: Element exists  
  1. User selects the element and triggers delete  
  2. System checks for dependents (note embeds referencing this element, or membership in a Group/Frame)  
  3. If dependents exist: confirmation prompt (confirm → remove or show broken-link)  
  4. If no dependents: deletes immediately  
  5. If the element belonged to a Group/Frame, it's also removed from that membership  
  6. Element is removed; dependent note embeds show broken-link state if the user confirmed removal

  Links to FR-022
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
- **Context:**
  Preconditions: A Note file is open  
  1. User types Markdown content (headers, lists, bullets, plain text, etc.)  
     1.1. If user enters invalid/unclosed Markdown syntax (e.g. unclosed code block) → system does not block editing; renders best-effort or shows raw text for the malformed portion  
  2. System renders formatting (live preview or rendered-on-the-fly, per standard Markdown editor conventions)  
  3. Content autosaves continuously  
  4. Note content is saved and reflects the user's edits

  Links to FR-023
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
- **Context:**
  Preconditions: Canvas is open; target note exists; canvas element exists; the element does not already have a note-link (a canvas element can hold at most one note-link at a time; many elements may point to the same note)  
  1. User selects a canvas element  
  2. User triggers "Link to Note" (context menu or toolbar)  
  3. System presents a note picker to search/browse the vault  
     3.1. If user cancels the picker → no link created  
  4. User selects a target note  
  5. In the same view, the note's content is shown with selectable blocks highlighted; user either confirms "whole note" or picks a specific block  
     5.1. If target note is empty (no blocks yet) → only "whole note" is offered as a target  
  6. System creates a link (stable ID reference) to the chosen target — the whole note, or the specific block  
  7. The canvas element gets a visual indicator showing it's linked  
  8. Canvas element is linked to the note or a specific block within it; clicking it navigates there (US-31)

  Links to FR-024
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
- **Context:**
  Preconditions: Same as US-25  
  1. User selects a canvas element and triggers "Link to Note" (see US-25)  
  2. System presents a note picker to search/browse the vault  
  3. User creates a brand-new note directly from this picker instead of choosing an existing one (quick-create)  
     3.1. Alternatively, the user chooses an existing note → standard flow in US-25  
  4. System creates the new note and links the canvas element to it (whole-note)

  Links to FR-024 (alt flow)
- **Acceptance Criteria:**
  1. **Given** the note picker is open, **when** the user selects "create new note," **then** an empty note is created.
  2. **Given** a note was just quick-created from the picker, **when** creation completes, **then** the canvas element is immediately linked to it (whole-note).
- **Dependencies:** US-25
- **Priority:** Should
- **Estimated Effort:** S

### US-27 — Handle removal of a linked block during normal editing
**As a** user, **I want** normal note editing to never be blocked, even when it touches a linked block, **so that** writing stays frictionless while I still get a say in what happens to the link.
- **Context:**
  Preconditions: A canvas element is linked to a specific block within a note  
  1. User edits the note in a way that removes the linked block (normal editing, not an explicit delete action)  
  2. System shows the confirm-before-delete prompt, as used for explicit deletions elsewhere  
  3. Edit proceeds; the canvas element's link is removed or shown as broken, depending on the user's choice  
  Note: this is a deliberate tradeoff — normal editing that touches a linked block interrupts with a prompt, which is in tension with the "get out of the way" principle. Worth revisiting once seen in a prototype.

  Links to FR-024 (exception)
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
- **Context:**
  Preconditions: Note is open; target canvas and element exist  
  1. User places the cursor at the desired location in the note  
  2. User triggers "Embed" (e.g. slash command or toolbar action)  
     2.1. Alternatively, the user types a link-style shorthand directly (e.g. `![[canvas-name#element]]`) → the system auto-converts it into a live preview embed  
  3. System presents a picker: browse to the target canvas, then select a specific element  
     3.1. If user cancels the picker → no embed created  
  4. User confirms the selection  
  5. System inserts an embed block referencing that element's stable ID  
  6. System renders a live, read-only preview of the element's current content inline in the note  
  7. Note contains an embed block; the preview reflects live canvas content and auto-updates when the source changes (US-34)

  Links to FR-025
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
- **Context:**
  Preconditions: Same as US-28; target Group or Frame exists  
  1. User places the cursor at the desired location in the note  
  2. User triggers "Embed" (e.g. slash command or toolbar action)  
  3. System presents a picker: browse to the target canvas, then select a Group or Frame  
     3.1. If user cancels the picker → no embed created  
  4. User confirms the selection  
  5. System inserts an embed block referencing the Group/Frame's stable ID  
  6. System renders a live, read-only preview showing all current members together  
     6.1. If Group/Frame membership changes after the embed is created → the embed tracks current membership dynamically. Adding a member is a silent, normal edit (embed picks it up automatically). Removing a member referenced by an existing embed is treated like a dependency-affecting deletion (confirm-or-broken-link prompt)  
  7. Note shows a live preview containing the Group/Frame's contents

  Links to FR-026
- **Acceptance Criteria:**
  1. **Given** the embed picker is open, **when** the user selects a Group or Frame instead of a single element, **then** the embed renders all current members together.
  2. **Given** an already-embedded Group/Frame, **when** a new element is added to it, **then** the embedded preview updates silently, with no confirmation.
  3. **Given** an already-embedded Group/Frame, **when** a member is removed from it, **then** the embedded preview updates silently to reflect the new membership, with no confirmation — the Group/Frame itself still exists, so nothing is broken.
- **Dependencies:** US-20, US-21, US-28
- **Priority:** Must
- **Estimated Effort:** M

### US-30 — Embed a viewport-crop preview
**As a** user, **I want** to embed just a specific region of a busy canvas, **so that** I can show relevant context without needing to Group/Frame it first.
- **Context:**
  Preconditions: Note is open; target canvas exists  
  1. User places the cursor in the note, triggers "Embed"  
  2. In the same unified picker as US-28/US-29, user selects the target canvas, then chooses "Define custom region" instead of picking an element/Group/Frame  
  3. System opens a view of the canvas allowing the user to drag out a rectangular region  
     3.1. If user cancels while drawing the crop → no embed created  
  4. User confirms the crop bounds  
  5. System creates a Crop entity (stable ID, storing the canvas reference and rectangle bounds) and inserts an embed block referencing it  
  6. Preview renders showing whatever canvas content currently falls within that rectangle  
     6.1. Alternatively, the user later reopens the embed and adjusts the crop rectangle's position/size directly from within the note  
     6.2. If canvas content within the crop region later changes (elements moved in/out, edited, deleted) → no special handling; the crop is purely spatial/coordinate-based, so the preview reflects whatever currently occupies that region, including showing it empty if nothing remains  
  7. Note contains a crop-based embed; the preview shows a live, auto-updating view of that canvas region

  Links to FR-027
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
- **Context:**
  Preconditions: Canvas element has an active link to a note (see US-25)  
  1. User single-clicks the linked element to navigate; double-clicking the element instead edits it (resolves the selection-vs-navigation conflict)  
  2. System opens the target note in the main content area  
     2.1. If link target no longer exists (broken link) → no navigation occurs; a broken-link indicator/message is shown instead, with the option to relink or remove (see US-35)  
  3. If the link points to a specific block, the system automatically scrolls to and highlights that block  
  4. User is viewing the target note, with the relevant block highlighted if applicable

  Links to FR-028
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
- **Context:**
  Preconditions: Note contains an embed referencing a canvas element/Group/Frame/Crop  
  1. User clicks the embed (embeds are read-only, so no competing "edit" interaction exists here, unlike canvas elements)  
  2. System opens the target canvas  
     2.1. If source no longer exists (broken embed) → no navigation occurs; broken-link indicator shown, with relink/remove option  
  3. System automatically pans/zooms the viewport to fit and select the referenced element/Group/Frame, or frames the Crop's rectangle bounds  
  4. User is viewing the source canvas with the relevant content in view and selected

  Links to FR-029
- **Acceptance Criteria:**
  1. **Given** a note embed, **when** the user clicks and interacts with it (e.g. panning/zooming within a viewport-crop preview), **then** the interaction happens in place, within the note, without navigating away.
  2. **Given** a note embed, **when** the user double-clicks it, **then** the source canvas opens with the viewport automatically panned/zoomed to fit and select the referenced content.
  3. **Given** a note embed whose source no longer exists, **when** the user double-clicks it, **then** a broken-link indicator is shown instead of navigating.
- **Dependencies:** US-28, US-29, US-30
- **Priority:** Must
- **Estimated Effort:** M

### US-33 — Remove a link or embed instantly
**As a** user, **I want** to remove a link or embed without extra confirmation, **so that** cleaning up references stays lightweight (I can always undo).
- **Context:**
  Preconditions: A link or embed exists  
  1. User selects the linked canvas element, or the embed block in the note  
  2. User triggers "Remove Link" / "Unlink"  
     2.1. Removal is instant, with no confirmation dialog; undo/redo (US-42) is the safety net for accidental unlinks  
  3. System removes the link/embed reference only  
  4. For a canvas-element link: the element remains on the canvas, simply no longer linked (loses its link indicator)  
  5. For a note embed: the embed block is removed from the note (the preview disappears), but the source canvas content is untouched  
  6. Link/embed reference removed; content on both sides is fully preserved

  Links to FR-030
- **Acceptance Criteria:**
  1. **Given** an existing link or embed, **when** the user triggers "Remove Link"/"Unlink," **then** the reference is removed instantly with no confirmation dialogue.
  2. **Given** a link/embed was just removed, **when** the underlying content on both sides is checked, **then** it remains fully intact and unaffected.
  3. **Given** a link/embed was just removed, **when** the user triggers undo, **then** the link/embed is restored.
- **Dependencies:** US-25, US-28, US-29, US-30
- **Priority:** Must
- **Estimated Effort:** S

### US-34 — Live auto-update of embedded previews
**As a** user, **I want** my note embeds to always reflect the current state of the canvas, **so that** I never see stale, out-of-date information.
- **Context:**
  Preconditions: A note contains an embed of a canvas element/Group/Frame/Crop  
  1. User edits the source canvas element (see US-22)  
  2. System persists the change  
  3. Any currently open note view showing that embed re-renders with the updated content  
     3.1. Alternatively, the note containing the embed isn't open at the time of the edit → the updated state is still persisted, so the embed shows current content the next time the note is opened (not just a live-session sync)  
  4. Embeds always reflect current source state, whether viewed live or after the fact

  Links to FR-031
- **Acceptance Criteria:**
  1. **Given** a note with an open embed of a canvas element, **when** that element is edited elsewhere, **then** the open note view updates automatically without a manual refresh.
  2. **Given** an embedding note is not currently open, **when** the source element is edited, **then** the update is persisted and shown the next time that note is opened.
- **Dependencies:** US-22, US-28
- **Priority:** Must
- **Estimated Effort:** M

### US-35 — Resolve a broken link
**As a** user, **I want** to relink or remove a broken reference, **so that** I can clean up my vault after deleting something that was still linked.
- **Context:**
  Preconditions: A link or embed exists whose target was deleted (e.g. the user previously chose "keep as broken" rather than remove), or otherwise became invalid  
  1. User sees a broken-link indicator — a grayed-out badge on a canvas element, or a "⚠ Missing content" placeholder where a note embed used to render  
     1.1. Alternatively, the user ignores the broken indicator and keeps working → it persists indefinitely until addressed, with no forced resolution  
  2. User clicks the broken indicator  
  3. System presents two options: Relink (pick a new target) or Remove (delete the dangling reference)  
  4. If Relink: system opens the same picker used in US-25/US-28, user selects a new valid target, the link now points there  
  5. If Remove: the broken reference is deleted outright — same lightweight, instant behaviour as US-33  
  6. The broken link is either relinked to a valid target or fully removed

  Links to FR-032
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
- **Context:**
  Preconditions: Vault has content  
  1. User opens search  
  2. User types a query  
  3. System searches note Markdown content and canvas element text (text elements, sticky notes, shape labels); scope is the current vault only, and matches on embedded canvas content appear only under the source canvas  
     3.1. If no results found → empty state message  
  4. System displays matching results with a context snippet and file location  
  5. User selects a result  
  6. System navigates there, scrolling to/highlighting the match  
  7. User is viewing the matched content

  Links to FR-034
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
- **Context:**
  Preconditions: Vault exists  
  1. User triggers "Export Vault"  
  2. System bundles all notes and canvases together (preserving folder structure)  
  3. Because all referenced content travels together in the bundle, links/embeds remain fully intact within it  
  4. Download is triggered  
  5. A complete, self-contained vault bundle is downloaded

  Links to FR-036
- **Acceptance Criteria:**
  1. **Given** a vault, **when** the user triggers "Export Vault," **then** all notes/canvases are bundled together into a single downloadable ZIP file, preserving folder structure.
  2. **Given** the exported ZIP, **when** it's opened or imported elsewhere, **then** all internal links/embeds remain fully functional.
- **Dependencies:** None
- **Priority:** Should
- **Estimated Effort:** M

### US-39 — Import files or a vault bundle
**As a** user, **I want** to import files or a previously exported vault, **so that** I can restore my work or bring in outside content.
- **Context:**
  Preconditions: User has a compatible export file  
  1. User triggers "Import"  
  2. User selects a file, or a vault bundle, to import  
  3. System creates corresponding notes/canvases/folders — loose files always import into the currently open vault; a full vault-bundle import always creates a brand-new vault  
     3.1. If naming collisions with existing content → consistent with US-12's policy (block, require manual rename)  
  4. System resolves any link references in the import back into internal stable IDs where their targets are present  
     4.1. If imported content references something not included in the import (partial import) → results in a broken link, handled the normal way (see US-35)  
  5. Imported content appears in the vault; links resolved wherever their targets are present

  Links to FR-037
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
- **Context:**
  Preconditions: User is editing note or canvas content  
  1. User makes an edit (types text, moves an element, etc.)  
  2. System detects the change  
  3. After a short debounce, the change is persisted — to local storage (anonymous) or the cloud (authenticated)  
     3.1. If network failure during cloud autosave → system queues the change locally and retries, showing a subtle, non-blocking "saving… / offline, retrying" indicator  
     3.2. If local storage quota exceeded (anonymous mode) → warning shown, same as US-01 step 5.2  
  4. No visible interruption to the user  
  5. Content is persisted with minimal lag; the user is never blocked from continuing to work

  Links to FR-038
- **Acceptance Criteria:**
  1. **Given** the user makes an edit, **when** a short debounce period elapses, **then** the change is persisted with no visible interruption.
  2. **Given** a cloud autosave attempt, **when** the network fails, **then** the change is queued locally, retried automatically, and a subtle, non-blocking indicator is shown.
  3. **Given** local storage quota is exceeded, **when** autosave attempts to persist, **then** the same warning as US-01 is surfaced.
- **Dependencies:** US-01, US-02
- **Priority:** Must
- **Estimated Effort:** M

### US-41 — Manual save
**As a** user, **I want** an explicit "Save" action, **so that** I have reassurance my work is safely stored, even with autosave running.
- **Context:**
  Preconditions: User is editing content  
  1. User triggers manual save (e.g. Ctrl/Cmd+S or a save button)  
  2. System immediately persists the current state (same mechanism as autosave, just explicitly triggered)  
     2.1. If save fails (network issue) → error shown, local state retained, retries automatically  
  3. System shows a brief confirmation (e.g. a "Saved" toast)  
  4. Current state is explicitly persisted, with visible confirmation to the user

  Links to FR-039
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
- **Context:**
  TODO: no flow specified. UC-47 is referenced in the old story but does not exist in 02-use-cases_v2.md.

  Links to FR-040
- **Acceptance Criteria:**
  1. **Given** a recent action on a canvas or in a note, **when** the user triggers undo, **then** that action is reverted.
  2. **Given** an action was just undone, **when** the user triggers redo, **then** the action is reapplied.
  3. **Given** the app is reloaded, **when** the user checks undo history, **then** no persistence across reloads/sessions is required.
- **Dependencies:** None
- **Priority:** Should *(explicitly de-prioritised by product owner relative to other work)*
- **Estimated Effort:** L *(often underestimated — needs a consistent action-history model across both canvas and note editors)*

---

## Baseline Interactions
*(Added after a completeness check — these were assumed as preconditions throughout every other section but never specified on their own.)*

### US-43 — Browse and open files from the file tree
**As a** user, **I want** to browse my vault's folder tree and open any note or canvas, **so that** I can access my existing content.
- **Context:**
  Preconditions: Vault is open and contains files/folders  
  1. User views the file tree in the sidebar  
  2. User expands/collapses folders to navigate  
  3. User clicks a file (note or canvas)  
  4. System opens that file's content in the main content area  
     4.1. If file content fails to load (e.g. corrupted data) → an error state is shown in the main area instead of content  
  5. Selected file's content is displayed and ready for interaction

  Links to FR-041
- **Acceptance Criteria:**
  1. **Given** a vault with folders and files, **when** the user expands or collapses a folder, **then** its contents show or hide accordingly.
  2. **Given** the file tree, **when** the user clicks a note or canvas, **then** its content loads into the main content area.
  3. **Given** a file's content is corrupted or fails to load, **when** the user selects it, **then** an error state is shown in the main area instead of content.
- **Dependencies:** US-08, US-09, US-10
- **Priority:** Must
- **Estimated Effort:** M

### US-44 — Pan and zoom the canvas viewport
**As a** user, **I want** to pan and zoom around a canvas, **so that** I can navigate large or busy whiteboards.
- **Context:**
  Preconditions: Canvas is open  
  1. User performs a pan gesture (click-drag on empty space, or scroll)  
  2. Viewport shifts accordingly  
  3. User performs a zoom gesture (scroll + modifier, pinch, or zoom controls)  
  4. Viewport zoom level changes; content scales accordingly  
     4.1. If zoom reaches minimum/maximum bounds → further attempts are clamped, no error shown  
  5. Viewport reflects the user's current pan position and zoom level for this session

  Links to FR-042
- **Acceptance Criteria:**
  1. **Given** an open canvas, **when** the user performs a pan gesture (drag or scroll), **then** the viewport shifts accordingly.
  2. **Given** an open canvas, **when** the user performs a zoom gesture (scroll+modifier, pinch, or zoom controls), **then** the content scales to the new zoom level.
  3. **Given** the viewport is at minimum or maximum zoom, **when** the user attempts to zoom further, **then** the zoom is clamped with no error.
- **Dependencies:** US-10
- **Priority:** Must
- **Estimated Effort:** S

### US-45 — Select canvas elements
**As a** user, **I want** to select one or more canvas elements, **so that** I can move, delete, group, or link them.
- **Context:**
  Preconditions: Canvas is open and contains at least one element  
  1. User clicks a single element → it becomes selected and visually highlighted  
     1.1. If user clicks blank canvas space → current selection is cleared  
  2. User performs a drag-select (rubber-band) over an area → all elements overlapping that area become selected (same partial-overlap rule as Frame membership, for consistency)  
  3. User shift-clicks additional elements → they're added to the current selection  
  4. Selected element(s) become the target of subsequent actions

  Links to FR-043
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

Every story above maps to exactly one Functional Requirement, except **FR-033** (many-to-many cardinality), which is intentionally not a standalone story — it's expressed as acceptance criteria within US-25, US-28, US-29, and US-30 instead, since cardinality isn't a user-facing action on its own.