# Use Case Specifications — Collaborative Whiteboard + Markdown App

*Living document. Built incrementally, in order: A → H (per inventory in 01-discovery-summary.md).*

---

## Section A: Account & Vault Management

### UC-01: Use the app anonymously (local-only)
- **Actor:** Individual user (unauthenticated)
- **Goal:** Start using the app immediately without creating an account
- **Preconditions:** User opens the app in a supported browser; no active login session
- **Main Flow:**
  1. User opens the app
  2. System detects no existing session/account
  3. System initializes a local, empty vault stored in browser storage
  4. User sees an empty file tree (empty state)
  5. User creates files/folders; all data persists only to browser local storage
- **Alternative Flows:**
  - A1: User has used the app anonymously before on this browser → system loads existing local vault instead of creating a new one
- **Exception Flows:**
  - E1: Browser storage unavailable/blocked (e.g. private browsing) → system warns that data won't persist between sessions
  - E2: Local storage quota exceeded → system warns and offers export or account creation
- **Postconditions:** User has an active local-only vault, persisted across sessions in that browser unless storage is cleared

### UC-02: Create an account (migrate local vault to cloud)
- **Actor:** Individual user (currently anonymous)
- **Goal:** Create an account and optionally migrate existing local data to the cloud
- **Preconditions:** User has been using the app anonymously (local data may or may not exist)
- **Main Flow:**
  1. User selects "Create Account"
  2. System prompts for signup credentials
  3. User submits valid credentials; system creates the account
  4. System detects existing local vault data and prompts to migrate it
  5. User confirms migration
  6. System uploads local vault data to the cloud, associated with the new account
- **Alternative Flows:**
  - A1: User declines migration → account created, but local data stays local-only and is not tied to the account
- **Exception Flows:**
  - E1: Signup fails (duplicate email, weak password, etc.) → error shown, user remains anonymous
  - E2: Migration fails partway (network failure) → system retries or rolls back, notifies user, local data is preserved as fallback either way
- **Postconditions:** User is authenticated; local vault data optionally migrated to the cloud

### UC-03: Log in to an existing account
- **Actor:** Registered user
- **Goal:** Access previously created cloud vault(s)
- **Preconditions:** User has a registered account
- **Main Flow:**
  1. User selects "Log In" and enters credentials
  2. System authenticates the user
  3. System loads the user's vault(s) from the cloud
- **Alternative Flows:**
  - A1: Local anonymous data exists on this browser at time of login → system prompts the user to merge that local data into the account (same merge flow as UC-02, step 4-6). If confirmed, local vault(s) are uploaded and added to the account's vault list.
- **Exception Flows:**
  - E1: Invalid credentials → error shown, retry allowed
  - E2: Network failure during login → error shown, retry allowed
  - E3: Merge fails partway (network failure) → system retries or rolls back; local data is preserved as fallback either way
- **Postconditions:** User is authenticated and viewing their cloud vault(s); any local anonymous data has been merged in if confirmed

### UC-04: Create a new vault
- **Actor:** Individual user (anonymous or authenticated — both support multiple vaults)
- **Goal:** Create an additional workspace to separate contexts
- **Preconditions:** None beyond having the app open (works in both anonymous and authenticated mode)
- **Main Flow:**
  1. User selects "Create Vault" and names it
  2. System creates a new, empty vault under the account
  3. User is switched into the new vault (or offered the choice)
- **Exception Flows:**
  - E1: Vault name is empty or duplicates an existing vault name → validation error
- **Postconditions:** A new empty vault exists and is accessible from the vault switcher

### UC-05: Switch between vaults
- **Actor:** Individual user (authenticated)
- **Goal:** Move context from one vault to another
- **Preconditions:** User has 2+ vaults
- **Main Flow:**
  1. User opens the vault switcher
  2. User selects a different vault
  3. System loads the selected vault's file tree
- **Exception Flows:**
  - E1: Vault fails to load (network/data issue) → error shown, user remains on current vault
- **Postconditions:** The newly selected vault is now the active context

### UC-06: Delete a vault
- **Actor:** Individual user (authenticated)
- **Goal:** Permanently remove a vault and all its contents
- **Preconditions:** Target vault exists
- **Main Flow:**
  1. User selects "Delete Vault"
  2. System shows a confirmation warning (irreversible; states how many notes/canvases will be lost)
  3. User confirms
  4. System permanently deletes the vault and all contained files/links
- **Alternative Flows:**
  - A1: User cancels at confirmation → no action taken
- **Exception Flows:**
  - E1: User deletes their only remaining vault → allowed. User is left with zero vaults and shown an empty state prompting them to create a new one.
- **Postconditions:** Vault and all its contents are permanently removed. Zero vaults is a valid state.

---

## Resolved Decisions (previously Open Questions)

1. **Anonymous multi-vault:** Anonymous mode supports multiple local vaults, same as authenticated accounts. *(Confirmed)*
2. **Deleting the last vault:** Allowed — zero vaults is a valid state, with an empty-state UI prompting creation. *(Confirmed)*
3. **Merge-on-login:** Logging in with existing local anonymous data present prompts the user to merge it into the account, using the same merge flow as account creation. *(Confirmed)*

---

## Section B: File & Folder Management

### UC-07: Create a folder
- **Actor:** Individual user
- **Goal:** Organize files into a folder structure
- **Preconditions:** User is viewing a vault
- **Main Flow:**
  1. User selects "New Folder" (at vault root or within an existing folder)
  2. User names the folder
  3. System creates the folder in the file tree
- **Exception Flows:**
  - E1: Folder name is empty or duplicates a sibling folder/file name at the same level → validation error
- **Postconditions:** New empty folder appears in the file tree

### UC-08: Create a new Note file
- **Actor:** Individual user
- **Goal:** Start a new Markdown note
- **Preconditions:** User is viewing a vault (at root or within a folder)
- **Main Flow:**
  1. User selects "New Note"
  2. System creates an empty Note file at the current location and opens it in the main content area
  3. User can immediately begin typing
- **Exception Flows:**
  - E1: Duplicate name at the same folder level → system auto-suffixes (e.g. "Untitled 2") rather than blocking, consistent with the "get out of the way" principle
- **Postconditions:** New Note file exists and is open for editing

### UC-09: Create a new Canvas file
- **Actor:** Individual user
- **Goal:** Start a new whiteboard
- **Preconditions:** User is viewing a vault (at root or within a folder)
- **Main Flow:**
  1. User selects "New Canvas"
  2. System creates an empty Canvas file at the current location and opens it in the main content area (blank canvas, no onboarding)
- **Exception Flows:**
  - E1: Duplicate name at the same folder level → system auto-suffixes, same as UC-08
- **Postconditions:** New Canvas file exists and is open for editing

### UC-10: Rename a file or folder
- **Actor:** Individual user
- **Goal:** Change the display name of a file or folder
- **Preconditions:** File or folder exists
- **Main Flow:**
  1. User triggers rename (e.g. double-click name, or context menu)
  2. User enters a new name
  3. System updates the display name
  4. If the renamed file has incoming links, system prompts: "Update visible label text on N link(s) to match the new name?" (see confirmed link-resiliency model — underlying connections never break regardless of the answer)
- **Alternative Flows:**
  - A1: User declines the label update → links keep functioning (via stable ID) but display the old label text
- **Exception Flows:**
  - E1: New name is empty or duplicates a sibling name → validation error, rename not applied
- **Postconditions:** File/folder has new display name; link connections remain intact; link labels updated only if user confirmed

### UC-11: Move a file to a different folder
- **Actor:** Individual user
- **Goal:** Reorganize the file tree
- **Preconditions:** File and target folder both exist
- **Main Flow:**
  1. User drags (or otherwise moves) a file into a different folder
  2. System updates the file's location in the tree
  3. Existing links to/from this file remain functional (stable ID based) — no prompt needed since names/paths aren't the link mechanism
- **Exception Flows:**
  - E1: Target folder already contains a file with the same name → validation error, move is blocked; user must rename manually first (confirmed: intentionally different from the auto-suffix behavior on file creation)
- **Postconditions:** File appears under its new parent folder; all links remain intact

### UC-12: Delete a note
- **Actor:** Individual user
- **Goal:** Permanently remove a note
- **Preconditions:** Note exists
- **Main Flow:**
  1. User selects "Delete" on a note
  2. System checks for incoming links (canvas elements pointing to this note, or other notes linking to it)
  3. **If no dependents exist:** system deletes immediately (lightweight confirmation only, e.g. simple "Are you sure?")
  4. **If dependents exist:** system shows the dependent-aware confirmation (per confirmed deletion model): "N canvas elements / notes link to this. Delete anyway?"
  5. User confirms
  6. System deletes the note; dependent links now display broken-link indicators
- **Alternative Flows:**
  - A1: User cancels at confirmation → no action taken
- **Postconditions:** Note is permanently removed; any dependent links show broken-link state

### UC-13: Delete a canvas
- **Actor:** Individual user
- **Goal:** Permanently remove a canvas
- **Preconditions:** Canvas exists
- **Main Flow:** Same structure as UC-12, but dependents checked are: notes embedding any element/group/frame/crop from this canvas, and any other references pointing into it
- **Postconditions:** Canvas is permanently removed; all embeds sourced from it show broken-link state

### UC-14: Delete a folder containing files
- **Actor:** Individual user
- **Goal:** Remove a folder and everything inside it
- **Preconditions:** Folder exists and contains one or more files/subfolders
- **Main Flow:**
  1. User selects "Delete" on a folder
  2. System recursively identifies all notes/canvases inside the folder (and subfolders) and aggregates all dependents across all of them
  3. System shows a single consolidated confirmation: "This folder contains N notes and M canvases. Deleting it will also break P links. Delete anyway?"
  4. User confirms
  5. System deletes the folder and everything inside it; all affected links show broken-link state
- **Alternative Flows:**
  - A1: User cancels → no action taken
- **Exception Flows:**
  - E1: Folder is empty → simple confirmation only, no dependent-link warning needed
- **Postconditions:** Folder and all contents permanently removed; dependent links across the whole subtree show broken-link state

---

## Section C: Canvas Editing

### UC-15: Add a text element to the canvas
- **Actor:** Individual user
- **Goal:** Capture a thought as free text on the canvas, with zero friction
- **Preconditions:** Canvas file is open
- **Main Flow:**
  1. User double-clicks a blank area of the canvas
  2. System creates a new text element at that position, ready for input immediately — no dialog, no tool selection required
  3. User types content
  4. User clicks away or presses Escape to finish editing
- **Alternative Flows:**
  - A1: User selects a "Text" tool from a toolbar instead of double-clicking → same result
- **Exception Flows:**
  - E1: User clicks away without typing anything → the empty element is discarded, not saved, keeping the canvas clean
- **Postconditions:** Canvas contains a new text element with a stable ID

### UC-16: Add a shape to the canvas
- **Actor:** Individual user
- **Goal:** Add a basic shape to visually organize or highlight ideas
- **Preconditions:** Canvas is open
- **Main Flow:**
  1. User selects a shape tool
  2. User clicks/drags to place and size the shape
  3. System creates the shape element
- **Exception Flows:**
  - E1: Shape drawn with negligible size (accidental click) → discarded, or given a sensible minimum default size
- **Postconditions:** Canvas contains a new shape element with a stable ID

### UC-17: Add a sticky note to the canvas
- **Actor:** Individual user
- **Goal:** Capture a short, visually distinct note on the canvas
- **Preconditions:** Canvas is open
- **Main Flow:**
  1. User selects the sticky note tool (or equivalent gesture) and places it
  2. System creates a sticky note element, ready for text input
  3. User types content
- **Exception Flows:**
  - E1: Empty sticky note discarded on click-away, same as UC-15
- **Postconditions:** Canvas contains a new sticky note element with a stable ID

### UC-18: Draw a connector/arrow between elements
- **Actor:** Individual user
- **Goal:** Visually relate two elements or points on the canvas
- **Preconditions:** Canvas is open (elements may or may not already exist)
- **Main Flow:**
  1. User selects the connector tool
  2. User drags from a source element to a target element
  3. System creates an arrow anchored to both elements — it moves if either element is repositioned
- **Alternative Flows:**
  - A1: User drags from an element to empty canvas space → the far end is unanchored/floating at that point
  - A2: User drags between two empty points → a free-floating connector is created, attached to nothing
- **Postconditions:** Canvas contains a connector. Per confirmed principle: this is **purely visual** — no semantic/data link is created between the connected elements.

### UC-19: Group multiple canvas elements
- **Actor:** Individual user
- **Goal:** Create a logical (non-visual) container of elements so they can be linked/embedded as a single unit
- **Preconditions:** 2+ elements exist and are selected
- **Main Flow:**
  1. User selects multiple elements (e.g. shift-click or drag-select)
  2. User triggers "Group"
  3. System creates a Group entity with a stable ID, referencing the selected elements
- **Alternative Flows:**
  - A1: User adds an element to an existing group later
  - A2: User removes an element from a group
- **Exception Flows:**
  - E1: User attempts to group elements where one is already part of another group — see Open Question 1 below (nested groups)
- **Postconditions:** Selected elements belong to a Group, itself addressable as a link target

### UC-20: Create a frame around canvas elements
- **Actor:** Individual user
- **Goal:** Create a *visible* container of elements (unlike a Group, which has no visible boundary)
- **Preconditions:** Canvas is open
- **Main Flow:**
  1. User selects the Frame tool
  2. User draws a rectangular region on the canvas
  3. Elements contained within the frame become its members
  4. System creates a Frame entity with a stable ID and a rendered visible border
- **Alternative Flows:**
  - A1: User resizes/moves the frame later — membership updates automatically based on containment
  - A2: User drags an element into or out of the frame boundary — membership updates automatically
- **Exception Flows:**
  - E1: An element only partially overlaps the frame boundary — see Open Question 2 below (containment rule)
- **Postconditions:** Frame exists with member elements; Frame is addressable as a link target

### UC-21: Edit/update a canvas element's content
- **Actor:** Individual user
- **Goal:** Modify an existing element's content, size, or position
- **Preconditions:** Element exists
- **Main Flow:**
  1. User selects/double-clicks the element
  2. User modifies content, size, or position
  3. System autosaves the change
  4. Any live embeds/previews elsewhere that reference this element update automatically, per the confirmed "canvas is source of truth" model
- **Postconditions:** Element is updated; all dependent previews reflect the new state

### UC-22: Delete a canvas element
- **Actor:** Individual user
- **Goal:** Remove a single element from the canvas
- **Preconditions:** Element exists
- **Main Flow:**
  1. User selects the element and triggers delete
  2. System checks for dependents (note embeds referencing this element, or membership in a Group/Frame)
  3. **If dependents exist:** confirmation prompt per the confirmed deletion model (confirm → remove or show broken-link)
  4. **If no dependents:** deletes immediately
  5. If the element belonged to a Group/Frame, it's also removed from that membership
- **Postconditions:** Element is removed; dependent note embeds show broken-link state if the user confirmed removal

### UC-23: Define a viewport-crop region *(reclassified — see note below)*

> **Reclassification note:** Originally scoped here as a standalone canvas action. Confirmed instead that a crop is defined *in the moment of embedding, from within the note* — not something a user pre-defines on the canvas by itself. This use case is folded into the embed-creation flow in **Section E (UC-29)** rather than detailed separately here, to avoid two conflicting versions of the same behavior.

---

## Resolved Decisions (previously Open Questions)

1. **Nested groups:** Not allowed. Groups/Frames are flat — one cannot contain another. *(Confirmed)*
2. **Frame containment rule:** Partial overlap counts as membership; an element does not need to be fully enclosed. *(Confirmed)*
3. **Where crops are defined:** In the moment of embedding, from within the note — see UC-29 in Section E. *(Confirmed)*

---

## Section D: Note Editing

### UC-24: Write/edit Markdown content in a note
- **Actor:** Individual user
- **Goal:** Organize thoughts using structured Markdown once clarity has emerged
- **Preconditions:** A Note file is open
- **Main Flow:**
  1. User types Markdown content (headers, lists, bullets, plain text, etc.)
  2. System renders formatting (live preview or rendered-on-the-fly, per standard Markdown editor conventions)
  3. Content autosaves continuously (per confirmed persistence model)
- **Exception Flows:**
  - E1: User enters invalid/unclosed Markdown syntax (e.g. unclosed code block) → system does not block editing; renders best-effort or shows raw text for the malformed portion
- **Postconditions:** Note content is saved and reflects the user's edits

---

## Section E: Linking & Embedding

### UC-25: Link a canvas element to a note (whole note or specific block)
*(Merges what was originally drafted as separate UC-25/UC-26 — confirmed to be a single unified flow.)*
- **Actor:** Individual user
- **Goal:** Attach a canvas element to a Markdown note — either the whole note or one specific block within it
- **Preconditions:** Canvas is open; target note exists; canvas element exists; the element does not already have a note-link (a canvas element can hold at most one note-link at a time — see cardinality note below)
- **Main Flow:**
  1. User selects a canvas element
  2. User triggers "Link to Note" (context menu or toolbar)
  3. System presents a note picker to search/browse the vault
  4. User selects a target note
  5. In the same view, the note's content is shown with selectable blocks highlighted; user either confirms "whole note" or picks a specific block
  6. System creates a link (stable ID reference) to the chosen target — the whole note, or the specific block
  7. The canvas element gets a visual indicator showing it's linked
- **Alternative Flows:**
  - A1: User creates a brand-new note directly from this picker instead of choosing an existing one (quick-create) — *recommended for MVP, avoids breaking flow*
- **Exception Flows:**
  - E1: User cancels the picker → no link created
  - E2: Target note is empty (no blocks yet) → only "whole note" is offered as a target
  - E3: The linked block is later removed through normal editing (not an explicit delete action) → **confirmed:** triggers the same confirm-before-delete modal used for explicit deletions elsewhere (see note on this tradeoff below)
- **Postconditions:** Canvas element is linked to the note or a specific block within it; clicking it navigates there (UC-30)

> **Note on E3:** This is a deliberate, informed tradeoff — normal editing that touches a linked block will interrupt with a confirmation modal, which is in tension with the "get out of the way" principle. Flagging as worth revisiting once we can see it in an actual prototype.

> **Cardinality (confirmed #54):** A single canvas element can link to only **one** note/block at a time (single target). There is **no restriction** on the reverse — many different canvas elements can all point to the same note.

### ~~UC-26~~ *(merged into UC-25 above)*

---

## Resolved Decisions (previously Open Questions, Batch 1)

1. **Unified UC-25/UC-26 flow:** Confirmed — one picker, choice of whole-note or specific block.
2. **Block-removal-during-editing warning level:** Confirmed — same heavy confirm modal as explicit deletions, with the tradeoff explicitly noted above.
3. **Cardinality (canvas element → note):** Confirmed — one target per element; many elements may point to the same note.

---

### UC-27: Embed a live preview of a canvas element inside a note
- **Actor:** Individual user
- **Goal:** Insert a live, read-only preview of a specific canvas element into note content, instead of retyping it
- **Preconditions:** Note is open; target canvas and element exist
- **Main Flow:**
  1. User places the cursor at the desired location in the note
  2. User triggers "Embed" (e.g. slash command or toolbar action)
  3. System presents a picker: browse to the target canvas, then select a specific element
  4. User confirms the selection
  5. System inserts an embed block referencing that element's stable ID
  6. System renders a live, read-only preview of the element's current content inline in the note
- **Alternative Flows:**
  - A1: User types a link-style shorthand directly (e.g. `![[canvas-name#element]]`), and the system auto-converts it into a live preview embed
- **Exception Flows:**
  - E1: User cancels the picker → no embed created
- **Postconditions:** Note contains an embed block; the preview reflects live canvas content and auto-updates when the source changes (UC-33)

### UC-28: Embed a live preview of a canvas Group/Frame inside a note
- **Actor:** Individual user
- **Goal:** Embed multiple related canvas elements as one preview block
- **Preconditions:** Same as UC-27; target Group or Frame exists
- **Main Flow:** Same as UC-27, except the user selects a Group or Frame instead of a single element in step 3; the preview renders all current members together
- **Exception Flows:**
  - E1: Group/Frame membership changes after the embed is created (elements added or removed) — see Open Question below (does the embed track *current* membership live, or *snapshot* the members at embed time?)
- **Postconditions:** Note shows a live preview containing the Group/Frame's contents

---

## Resolved Decision (previously Open Question, Batch 2)

**Group/Frame membership in embeds:** Dynamic. Adding a member is a silent, normal edit — the embed picks it up automatically. Removing a member that's referenced by an existing embed is treated like a dependency-affecting deletion: the same confirm-or-broken-link prompt applies.

---

### UC-29: Embed a viewport-crop preview of a canvas region inside a note
- **Actor:** Individual user
- **Goal:** Embed a live preview of a specific rectangular region of a canvas — useful for showing partial context of a busy canvas without needing to Group/Frame it first
- **Preconditions:** Note is open; target canvas exists
- **Main Flow:**
  1. User places the cursor in the note, triggers "Embed"
  2. In the same unified picker as UC-27/28, user selects the target canvas, then chooses "Define custom region" instead of picking an element/Group/Frame
  3. System opens a view of the canvas allowing the user to drag out a rectangular region
  4. User confirms the crop bounds
  5. System creates a Crop entity (stable ID, storing the canvas reference and rectangle bounds) and inserts an embed block referencing it
  6. Preview renders showing whatever canvas content currently falls within that rectangle
- **Alternative Flows:**
  - A1: User later reopens the embed and adjusts the crop rectangle's position/size directly from within the note
- **Exception Flows:**
  - E1: User cancels while drawing the crop → no embed created
  - E2: Canvas content within the crop region later changes (elements moved in/out, edited, deleted) → no special handling needed; the crop is purely spatial/coordinate-based, so the preview simply reflects whatever currently occupies that region, including showing it empty if nothing remains there
- **Postconditions:** Note contains a crop-based embed; the preview shows a live, auto-updating view of that canvas region

---

### UC-30: Navigate to a linked note from a canvas element
- **Actor:** Individual user
- **Goal:** Quickly jump from a canvas element to the note (or specific block) it's linked to
- **Preconditions:** Canvas element has an active link to a note, per UC-25
- **Main Flow:**
  1. User single-clicks the linked element to navigate; double-clicking the element instead edits it (confirmed interaction pattern — resolves the selection-vs-navigation conflict)
  2. System opens the target note in the main content area
  3. If the link points to a specific block, the system automatically scrolls to and highlights that block
- **Exception Flows:**
  - E1: Link target no longer exists (broken link) → no navigation occurs; a broken-link indicator/message is shown instead, with the option to relink or remove (ties into UC-38)
- **Postconditions:** User is viewing the target note, with the relevant block highlighted if applicable

### UC-31: Navigate to the source canvas element from a note embed
- **Actor:** Individual user
- **Goal:** Jump from an embedded preview in a note to the actual canvas content it comes from (embeds are read-only, so editing requires going to the source)
- **Preconditions:** Note contains an embed referencing a canvas element/Group/Frame/Crop
- **Main Flow:**
  1. User clicks the embed (since it's read-only, no competing "edit" interaction exists here — unlike canvas elements)
  2. System opens the target canvas
  3. System automatically pans/zooms the viewport to fit and select the referenced element/Group/Frame, or frames the Crop's rectangle bounds
- **Exception Flows:**
  - E1: Source no longer exists (broken embed) → no navigation occurs; broken-link indicator shown, with relink/remove option
- **Postconditions:** User is viewing the source canvas with the relevant content in view and selected

---

## Resolved Decision (previously Open Question, Batch 4)

**Interaction conflict on canvas elements:** Confirmed — single click navigates to the linked note; double-click edits the element.

## New Open Question — Follow-on From This

Since a single click now instantly navigates away from the canvas, this raises the split-pane question more sharply: if you're mid-thought on a canvas and single-click a linked element by habit, you're now fully off the canvas and looking at a note. Getting back requires backtracking.

**Should the main content area always fully swap between canvas and note (with simple back-navigation), or should there be a split-pane/side-by-side view so canvas and its linked note can be visible at once — at least for MVP?**

## Resolved Decision — Split-Pane Question

MVP uses **full swap only**: canvas and note replace each other in the main content area, with easy back-navigation. No split-pane for MVP.

---

### UC-32: Remove a link/embed without deleting the underlying content
- **Actor:** Individual user
- **Goal:** Detach a link (canvas → note) or embed (note → canvas) while keeping both sides' content intact
- **Preconditions:** A link or embed exists
- **Main Flow:**
  1. User selects the linked canvas element, or the embed block in the note
  2. User triggers "Remove Link" / "Unlink"
  3. System removes the link/embed reference only
  4. For a canvas-element link: the element remains on the canvas, simply no longer linked (loses its link indicator)
  5. For a note embed: the embed block is removed from the note (the preview disappears), but the source canvas content is untouched
- **Exception Flows:** *(see Open Question below — is any confirmation needed here at all?)*
- **Postconditions:** Link/embed reference removed; content on both sides is fully preserved

### UC-33: Embedded preview auto-updates when its source changes
- **Actor:** System (triggered indirectly by the user editing a canvas element)
- **Goal:** Keep embeds truthful to current source content at all times
- **Preconditions:** A note contains an embed of a canvas element/Group/Frame/Crop
- **Main Flow:**
  1. User edits the source canvas element (UC-21)
  2. System persists the change
  3. Any currently open note view showing that embed re-renders with the updated content
- **Alternative Flows:**
  - A1: The note containing the embed isn't open at the time of the edit → the updated state is still persisted, so the embed shows current content the next time the note is opened (not just a live-session sync)
- **Postconditions:** Embeds always reflect current source state, whether viewed live or after the fact

---

## Resolved Decision — Unlink Confirmation

Removing a link/embed is instant, with no confirmation dialog. Undo/redo (UC-47) is the intended safety net for accidental unlinks.

## Quality Control Note — Duplicate Use Cases Identified

The following inventory items are **not distinct flows** — they describe behavior already fully specified elsewhere. Cross-referenced here rather than duplicated, to avoid two sources of truth drifting apart:

| Inventory ID | Duplicates | Notes |
|---|---|---|
| UC-34 (rename a linked file) | **UC-10** (Section B) | Same stable-ID rename behavior, already fully specified |
| UC-35 (delete canvas element w/ dependents) | **UC-22** (Section C) | Same dependent-check-then-confirm flow |
| UC-36 (delete canvas w/ dependents) | **UC-13** (Section B) | Same flow, canvas-level |
| UC-37 (delete note that canvas elements point to) | **UC-12** (Section B) | Same flow, note-level |
| UC-39 (same element linked into multiple notes) | **UC-25** + cardinality decision #23 | Just confirms many-to-many is supported; not a separate flow |
| UC-40 (multiple embeds from multiple canvases) | **UC-27/28/29** + cardinality decision #23 | Same as above |

---

### UC-38: Encounter and resolve a broken link
- **Actor:** Individual user
- **Goal:** Notice a broken link/embed and either fix it or clean it up
- **Preconditions:** A link or embed exists whose target was deleted (e.g. the user previously chose "keep as broken" rather than remove, per the confirm-or-broken-link model), or otherwise became invalid
- **Main Flow:**
  1. User sees a broken-link indicator — a grayed-out badge on a canvas element, or a "⚠ Missing content" placeholder where a note embed used to render
  2. User clicks the broken indicator
  3. System presents two options: **Relink** (pick a new target) or **Remove** (delete the dangling reference)
  4. **If Relink:** system opens the same picker used in UC-25/UC-27, user selects a new valid target, the link now points there
  5. **If Remove:** the broken reference is deleted outright — same lightweight, instant behavior as UC-32
- **Alternative Flows:**
  - A1: User ignores the broken indicator and keeps working — it persists indefinitely until addressed, with no forced resolution
- **Postconditions:** The broken link is either relinked to a valid target or fully removed

---

## Section E: Complete

That closes out Linking & Embedding — the most complex section, and the one with the most product-defining decisions. Sections B–E are now internally consistent, with duplicates and edge cases called out rather than glossed over.

## Open Question / Recommendation

Since broken links can persist silently (per A1 above) until a user happens to notice them, there's no way to find them all at once. **Should there be a "find all broken links" maintenance view for the vault (a simple list), or is stumbling across them one at a time acceptable for MVP?** This isn't blocking — flagging it now while we're still in this headspace, but happy to park it as a Fast-Follow item if you'd rather keep moving.

## Resolved Decision — Broken-Links Maintenance View

Deferred to Fast-Follow, not MVP. Broken links are surfaced only when encountered directly (UC-38), not via a dedicated list view for now.

---

## Section F: Search

### UC-41: Search across notes and canvas elements
- **Actor:** Individual user
- **Goal:** Find content anywhere in the current vault by text
- **Preconditions:** Vault has content
- **Main Flow:**
  1. User opens search
  2. User types a query
  3. System searches note Markdown content and canvas element text (text elements, sticky notes, shape labels)
  4. System displays matching results with a context snippet and file location
  5. User selects a result
  6. System navigates there, scrolling to/highlighting the match
- **Exception Flows:**
  - E1: No results found → empty state message
- **Postconditions:** User is viewing the matched content

---

## Resolved Decisions — Section F

1. **Search scope:** Vault-scoped only. No cross-vault search for MVP.
2. **Embedded content in results:** Matches on embedded canvas content appear only under the source canvas, never duplicated under embedding notes.

---

## Section G: Export / Import

### UC-42: Export a single note or canvas as a file
- **Actor:** Individual user
- **Goal:** Get a standalone file copy of one note or canvas
- **Preconditions:** File exists
- **Main Flow:**
  1. User selects a note or canvas, triggers "Export"
  2. System generates a downloadable file (exact format is an architecture decision for later — e.g. `.md` for notes)
  3. File download is triggered
- **Exception Flows:**
  - E1: The file contains links/embeds pointing to other vault content — see Open Question 1 below, since a standalone file loses vault context entirely
- **Postconditions:** A file is downloaded to the user's device

### UC-43: Export an entire vault
- **Actor:** Individual user
- **Goal:** Get a full, portable backup of the whole vault
- **Preconditions:** Vault exists
- **Main Flow:**
  1. User triggers "Export Vault"
  2. System bundles all notes and canvases together (preserving folder structure)
  3. Because all referenced content travels together in the bundle, links/embeds **remain fully intact** within it — this is the one export path where nothing breaks
  4. Download is triggered
- **Postconditions:** A complete, self-contained vault bundle is downloaded

### UC-44: Import files or a vault into the app
- **Actor:** Individual user
- **Goal:** Bring external files or a previously exported vault back into the app
- **Preconditions:** User has a compatible export file
- **Main Flow:**
  1. User triggers "Import"
  2. User selects a file, or a vault bundle, to import
  3. System creates corresponding notes/canvases/folders — see Open Question 2 below (new vault vs. merge into current)
  4. System resolves any link references in the import back into internal stable IDs where their targets are present
- **Exception Flows:**
  - E1: Naming collisions with existing content — consistent with UC-11's policy (block, require manual rename) unless you'd rather this behave differently
  - E2: Imported content references something not included in the import (partial import) → results in a broken link, handled the normal way (UC-38)
- **Postconditions:** Imported content appears in the vault; links resolved wherever their targets are present

---

## Resolved Decisions — Section G

1. **Single-file export with outgoing links:** Links are kept as standard Markdown links in the exported file — readable and traceable, even though non-functional outside the vault.
2. **Import destination:** Loose files always import into the currently open vault. A full vault-bundle import always creates a brand-new vault.

---

## Section H: Persistence

### UC-45: Changes autosave continuously
- **Actor:** System (background, triggered by user edits)
- **Goal:** Persist changes automatically with no user action required
- **Preconditions:** User is editing note or canvas content
- **Main Flow:**
  1. User makes an edit (types text, moves an element, etc.)
  2. System detects the change
  3. After a short debounce, the change is persisted — to local storage (anonymous) or the cloud (authenticated)
  4. No visible interruption to the user
- **Alternative Flows:**
  - A1: Network failure during cloud autosave → system queues the change locally and retries, showing a subtle, non-blocking "saving… / offline, retrying" indicator
- **Exception Flows:**
  - E1: Local storage quota exceeded (anonymous mode) → warning shown, same as UC-01 E2
- **Postconditions:** Content is persisted with minimal lag; the user is never blocked from continuing to work

### UC-46: Manually trigger a save
- **Actor:** Individual user
- **Goal:** Force an explicit save for reassurance, alongside autosave
- **Preconditions:** User is editing content
- **Main Flow:**
  1. User triggers manual save (e.g. Ctrl/Cmd+S or a save button)
  2. System immediately persists the current state (same mechanism as autosave, just explicitly triggered)
  3. System shows a brief confirmation (e.g. a "Saved" toast)
- **Exception Flows:**
  - E1: Save fails (network issue) → error shown, local state retained, retries automatically
- **Postconditions:** Current state is explicitly persisted, with visible confirmation to the user

---

## Section I: Baseline Interactions
*(Added after a completeness check revealed these were assumed as preconditions throughout, but never specified on their own.)*

### UC-48: Browse and open a file from the file tree
- **Actor:** Individual user
- **Goal:** Navigate the vault's folder tree and open a note or canvas
- **Preconditions:** Vault is open and contains files/folders
- **Main Flow:**
  1. User views the file tree in the sidebar
  2. User expands/collapses folders to navigate
  3. User clicks a file (note or canvas)
  4. System opens that file's content in the main content area
- **Exception Flows:**
  - E1: File content fails to load (e.g. corrupted data) → an error state is shown in the main area instead of content
- **Postconditions:** Selected file's content is displayed and ready for interaction

### UC-49: Pan and zoom the canvas viewport
- **Actor:** Individual user
- **Goal:** Navigate around a canvas to view different areas and zoom levels
- **Preconditions:** Canvas is open
- **Main Flow:**
  1. User performs a pan gesture (click-drag on empty space, or scroll)
  2. Viewport shifts accordingly
  3. User performs a zoom gesture (scroll + modifier, pinch, or zoom controls)
  4. Viewport zoom level changes; content scales accordingly
- **Exception Flows:**
  - E1: Zoom reaches minimum/maximum bounds → further attempts are clamped, no error shown
- **Postconditions:** Viewport reflects the user's current pan position and zoom level for this session

### UC-50: Select canvas elements (single and multi-select)
- **Actor:** Individual user
- **Goal:** Select one or more elements to act on them (move, delete, group, link, etc.)
- **Preconditions:** Canvas is open and contains at least one element
- **Main Flow:**
  1. User clicks a single element → it becomes selected and visually highlighted
  2. User performs a drag-select (rubber-band) over an area → all elements overlapping that area become selected (same partial-overlap rule as Frame membership, for consistency)
  3. User shift-clicks additional elements → they're added to the current selection
- **Exception Flows:**
  - E1: User clicks blank canvas space → current selection is cleared
- **Postconditions:** Selected element(s) become the target of subsequent actions

---

## All Sections Complete (A–I)

Every use case in the original inventory has been fully detailed, merged, or cross-referenced as a duplicate — plus three baseline interactions (Section I) added after a completeness check.
