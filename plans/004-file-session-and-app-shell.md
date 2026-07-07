# Plan 004: File session (open/save/dirty) and Tauri app shell

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: plan 001 must be DONE in `plans/README.md`
> (`src/editor.ts`, `src-tauri/` exist; `npm test` passes). Plans 002/003 may or
> may not be done — this plan is independent of them and must not touch their
> files. If `src/session/` already exists, STOP and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches user files on disk — data safety is the point)
- **Depends on**: plans/001-scaffold-and-verification-baseline.md
- **Category**: feature (file IO, Notepad semantics)
- **Planned at**: commit `91467ad`, 2026-07-06

## Why this matters

Unvaulted's app behavior is deliberately **Notepad, not Obsidian**: open one file
per window, edit in memory, save only on Ctrl+S, show `*` when dirty, confirm on
close, never corrupt a file. These are locked product decisions (manual save was
chosen consciously over Obsidian's autosave). This plan implements them: a pure,
unit-testable `file-session` state module plus the thin Tauri shell around it
(dialogs, CLI file argument, drag-drop, atomic write).

## Current state

After plan 001 (the only dependency):

- `src/editor.ts` — `createEditor(parent, initialText): EditorView`.
- `src/main.ts` — mounts the editor with `''`.
- `src-tauri/` — default Tauri v2 scaffold: no custom commands, single window,
  `tauri.conf.json` with `productName: Unvaulted`, identifier
  `com.rifkiadam.unvaulted`.
- Verification baseline: `npm run typecheck`, `npm test`, `npm run build`,
  `cargo check` (in `src-tauri/`) all green.

Product decisions this plan implements (inlined spec):

1. **Manual save only** — Ctrl+S writes to disk; no autosave of any kind.
2. **Dirty indicator** — window title is `<filename>.md — Unvaulted` clean,
   `<filename>.md* — Unvaulted` dirty; `Unvaulted` when no file.
3. **Confirm on close** — closing a dirty window asks Save / Don't save / Cancel
   (native dialog).
4. **Atomic save** — write to a temp file in the same directory, then rename over
   the target; a crash mid-save must never leave a truncated file.
5. **One file per window; no tabs.** Opening a file *into* a window replaces that
   window's document only when the current doc is clean or the user confirms.
6. **Open paths**: OS file association / CLI argument (`unvaulted C:\note.md`),
   Ctrl+O native dialog, drag-drop onto the window.
7. **Empty state**: launched with no file → editor area shows a dim centered hint
   "Ctrl+O to open a file — or drop one here".
8. Encoding: read/write UTF-8; preserve the file's existing line endings on save
   (detect CRLF vs LF at load; normalize the editor to LF internally; re-apply on save).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install JS deps | `npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-opener` | exit 0 |
| Add Rust plugins | `cargo add tauri-plugin-dialog tauri-plugin-fs tauri-plugin-opener` (inside `src-tauri/`) | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass |
| Build | `npm run build` && `cargo check` in `src-tauri/` | exit 0 |
| Manual smoke | `npm run tauri dev` / `npm run tauri dev -- -- <path-to-md>` | see Step 6 |

(If the plugin crate/package names differ in the installed Tauri v2 minor version,
use the names from the official Tauri v2 plugin workspace and record the deviation
in your report. Atomic rename is implemented as a **custom Rust command** — the fs
plugin alone doesn't guarantee same-directory temp+rename.)

## Scope

**In scope:**
- `src/session/fileSession.ts` (new) — pure state machine (no Tauri imports).
- `src/session/platform.ts` (new) — `Platform` interface + Tauri implementation.
- `src/main.ts` (modify) — wire session ↔ editor ↔ platform; empty-state hint;
  keyboard shortcuts (Ctrl+S, Ctrl+O, Ctrl+W); drag-drop; title updates;
  close-requested handling.
- `src-tauri/src/lib.rs` / `main.rs` (modify) — register plugins; custom command
  `save_atomic(path, contents)`; pass CLI arg to the frontend (e.g. via an
  invoke command `get_open_path()` reading `std::env::args`).
- `src-tauri/tauri.conf.json` + `src-tauri/capabilities/*` (modify) — plugin
  permissions: dialog, fs read, opener open-url; drag-drop enabled on the window.
- `tests/session/fileSession.test.ts` (new).
- `package.json`, `src-tauri/Cargo.toml` (the named deps only).

**Out of scope (do NOT touch):**
- `src/markdown/**`, `src/preview/**` (plans 002/003) — do not import from them.
  Exception: if plan 003 is already DONE, `src/main.ts` may already pass its
  extension — leave whatever `createEditor` wiring exists intact.
- Theme (005), packaging/installer (006), autosave (rejected by design),
  recent-files list, multi-tab anything.

## Interface contract

`src/session/fileSession.ts` — pure, fully unit-testable:

```ts
export type LineEnding = 'lf' | 'crlf';
export interface SessionState {
  path: string | null;          // null = untitled/empty state
  loadedText: string;           // text as of last load/save (LF-normalized)
  currentText: string;          // editor text (LF-normalized)
  lineEnding: LineEnding;       // detected at load, re-applied at save
}
export function emptySession(): SessionState;
export function loadFile(path: string, rawContents: string): SessionState;   // detects CRLF, normalizes
export function updateText(s: SessionState, text: string): SessionState;
export function isDirty(s: SessionState): boolean;                            // currentText !== loadedText
export function windowTitle(s: SessionState): string;                         // per decision #2, basename only
export function serializeForSave(s: SessionState): string;                    // re-applies lineEnding
export function afterSave(s: SessionState): SessionState;                     // loadedText = currentText
export type CloseDecision = 'close' | 'ask';
export function onCloseRequested(s: SessionState): CloseDecision;             // 'ask' iff dirty
```

`src/session/platform.ts`:

```ts
export interface Platform {
  readFile(path: string): Promise<string>;
  saveAtomic(path: string, contents: string): Promise<void>;   // invokes Rust command
  showOpenDialog(): Promise<string | null>;                    // .md filter
  confirmClose(fileName: string): Promise<'save' | 'discard' | 'cancel'>;
  setTitle(title: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  getCliOpenPath(): Promise<string | null>;
  onFileDrop(cb: (path: string) => void): void;
  onCloseRequested(cb: () => Promise<boolean>): void;          // return true = allow close
}
export function tauriPlatform(): Platform;
```

`main.ts` composes: `getCliOpenPath()` → load or empty state; editor
`updateListener` → `updateText` → `setTitle(windowTitle(s))`; Ctrl+S →
`saveAtomic(path, serializeForSave(s))` (Ctrl+S with `path === null` → open-dialog
first, i.e. save-as-lite: pick target via save dialog — if the dialog plugin's save
variant is available; otherwise Ctrl+S on untitled is a no-op with the hint shown —
record which in the report); Ctrl+W / window close → `onCloseRequested` flow.

## Steps

### Step 1: Pure `fileSession.ts` + full unit tests

Implement the interface contract exactly. Tests
(`tests/session/fileSession.test.ts`) cover: CRLF detection + round-trip
(`"a\r\nb"` loads to LF internally, `serializeForSave` restores CRLF); dirty
transitions (load → clean; edit → dirty; undo back to identical text → clean;
afterSave → clean); `windowTitle` all three forms (`Unvaulted`,
`note.md — Unvaulted`, `note.md* — Unvaulted`, basename from a full Windows path);
`onCloseRequested` ask-iff-dirty.

**Verify**: `npm test` → all pass (no Tauri needed).

### Step 2: Rust side — plugins, `save_atomic`, CLI path

Register dialog/fs/opener plugins. Implement `save_atomic`: write
`<dir>/.<name>.tmp-<pid>`, then `std::fs::rename` over the target (same
directory); return errors as strings. Implement `get_open_path` from
`std::env::args().nth(1)` (validate it ends `.md`/`.markdown` and exists — else
`None`). Configure capabilities/permissions minimally (dialog, opener; fs read
scoped as broadly as needed for arbitrary user files — document what you granted).

**Verify**: `cargo check` → exit 0.

### Step 3: `platform.ts` Tauri implementation

Implement `tauriPlatform()` against the plugin JS APIs + `invoke('save_atomic')`
/ `invoke('get_open_path')`; drag-drop via the window's file-drop event; close via
the window close-requested event (prevent default, run callback, close if allowed).

**Verify**: `npm run typecheck && npm run build` → exit 0.

### Step 4: Wire `main.ts` (shortcuts, title, empty state)

Compose per the contract section. Empty-state hint: a positioned div over the
editor, class `uv-empty-hint`, text exactly `Ctrl+O to open a file — or drop one
here`, hidden as soon as a file loads or the user types. Keyboard: use CodeMirror
`keymap.of([...])` entries for `Mod-s`, `Mod-o`, `Mod-w` (all `preventDefault`).

**Verify**: `npm run typecheck && npm test && npm run build` → exit 0.

### Step 5: Close-confirmation flow

On close request with dirty state: `confirmClose(basename)` → `save` saves then
closes (abort close on save failure and surface the error), `discard` closes,
`cancel` keeps the window. Ctrl+W routes through the same path.

**Verify**: `npm run typecheck && npm run build` → exit 0.

### Step 6: Manual smoke matrix (report each)

With `npm run tauri dev`:

1. Launch bare → hint shown, title `Unvaulted`.
2. Ctrl+O → open a real `.md` → content shows, title `name.md — Unvaulted`, hint gone.
3. Type → title gains `*`. Ctrl+S → `*` clears; file on disk updated (check in
   another editor); CRLF file stays CRLF (open in a hex/`file`-capable viewer or
   assert via PowerShell `(Get-Content -Raw x.md) -match "\r\n"`).
4. Edit → close window → dialog appears; test all three buttons across runs.
5. Drag a `.md` from Explorer onto the window (clean state) → it loads.
6. `npm run tauri dev -- -- C:\path\to\note.md` → opens with that file loaded.

## Test plan

- `tests/session/fileSession.test.ts` — the full matrix in Step 1 (this is where
  the data-safety logic lives; aim for exhaustive small cases, ~15+ assertions).
- Platform/shell layers are covered by the Step 6 manual matrix (reported), plus
  `cargo check`. No mocked-Tauri tests — thin glue, real behavior verified by hand.

## Done criteria

- [ ] `npm run typecheck`, `npm test`, `npm run build` exit 0; `cargo check` exits 0
- [ ] `fileSession.test.ts` covers dirty transitions, CRLF round-trip, titles, close decision
- [ ] `grep -rn "@tauri-apps" src/session/fileSession.ts` returns no matches (pure module)
- [ ] Manual smoke matrix (Step 6) fully reported, all six behaviors correct
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 not DONE, or baseline commands fail before you start.
- Tauri v2 plugin names/APIs differ beyond simple renames from what this plan
  assumes (report the actual API surface you found).
- The window close-requested event cannot be intercepted to run an async dialog
  (report the event API available).
- Atomic rename fails on Windows for files on the same volume after one fix
  attempt (report the error).

## Maintenance notes

- Plan 003's image `basePath` facet and external-link opener should be fed from
  this plan's session (`path`'s directory) and `openExternal` — if 003 landed
  first, wire both here; if not, leave the defaults and note it.
- Plan 006 registers the file association that makes Explorer double-click deliver
  the CLI path this plan already consumes — no code change expected there.
- Reviewer should scrutinize: save-failure paths (error surfaced, close aborted,
  no data loss) and that `fileSession.ts` stayed free of Tauri imports.

## Amendment — 2026-07-07 — inline title (operator request during plan 003 smoke)

Add one UI element to this plan's scope: an **Obsidian-style inline title**
above the editor content.

- Content: the opened file's **basename without extension** (`SKILL.md` →
  `SKILL`). Derive it in `fileSession.ts` (pure function, e.g.
  `inlineTitle(s: SessionState): string | null` — null when no file is open;
  unit-test it alongside `windowTitle`).
- Rendering: a non-editable element ABOVE the CodeMirror content (outside the
  editor's line numbering entirely — the operator calls it "line 0"), class
  `uv-inline-title`, structural CSS only (large bold text; plan 005 skins it).
  Simplest correct placement: a plain `<div>` injected before the editor in the
  app layout, updated when a file loads. Do not implement it as an editor
  decoration — it must not be part of the document or selectable as text.
- Read-only by design: changing it = renaming the file, which is out of MVP
  scope (no rename affordance). No click/edit handlers.
- Empty/untitled state: hidden (no file open → no title).
- Manual smoke (add to Step 6 matrix): open a file → its basename appears as
  the big title above line 1; the title is not selectable/editable; opening a
  different file updates it.
