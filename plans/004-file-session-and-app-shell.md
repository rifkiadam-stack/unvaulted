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

## Correction round 1 — 2026-07-07 — Step 6 smoke: three app-shell bugs

Operator smoke results: drag-drop load PASS. Everything else failed —
`*` never appears on typing, Ctrl+O/Ctrl+S do nothing, inline title never shows,
and the window won't close even after answering the save dialog. Reviewer read
the code; the failures reduce to three linked root causes, two of which trace to
under-specification in this plan (owned by the plan author).

**Bug A (root cause of most symptoms) — missing window `set-title` permission
cascades through `updateState`.** `src/session/platform.ts:setTitle` calls
`getCurrentWindow().setTitle(...)`, but `src-tauri/capabilities/default.json`
grants only `core:default` (+dialog/opener/fs) — it does NOT grant
`core:window:allow-set-title`, so `setTitle` **rejects**. In `main.ts:updateState`,
`await platform.setTitle(...)` is line 1 of the function; it runs BEFORE the
inline-title and empty-hint updates, so its rejection aborts `updateState`
mid-way every time. That single failure explains: no `*` in the title, inline
title never appears, empty hint never hides — and it also makes `doSave()` return
`false` (its `await updateState(...)` throws inside the try), which is why
choosing "save" on close does nothing. Two-part fix:
1. Add `"core:window:allow-set-title"` to the `permissions` array in
   `src-tauri/capabilities/default.json`.
2. Defense-in-depth: in `updateState`, wrap the `setTitle` call in its own
   try/catch (log and continue) so a title failure can never again abort the
   inline-title / hint / dirty-indicator updates. Title is cosmetic; it must not
   gate core UI.

**Bug B (plan-author error — Step 4 instruction was wrong) — global shortcuts
only fire when the editor is focused.** Step 4 said to register Ctrl+O/S/W via
CodeMirror `keymap.of([...])`. A CodeMirror keymap only fires while the editor
has DOM focus, so at the empty-state screen (nothing focused yet) Ctrl+O is dead,
and the webview may also swallow Ctrl+S ("save page") before CodeMirror sees it.
Fix: register these three as **window-level** shortcuts — a single
`document.addEventListener('keydown', ...)` (or Tauri's global-shortcut plugin;
prefer the plain DOM listener, no new dependency) that matches
Ctrl/Cmd+O/S/W, calls `e.preventDefault()`, and invokes `doOpen` / `doSave` /
the close flow. Remove those three from the CodeMirror keymap (leave all other
editor keybindings alone). This makes them work regardless of focus — correct
for a Notepad-style app.

**Bug C (Tauri v2 async-close pattern) — window never closes even when allowed.**
`platform.ts:onCloseRequested` awaits the callback and only then calls
`event.preventDefault()`. In Tauri v2 the close event must be prevented
**synchronously**; deciding after an `await` is too late and leaves the window in
a stuck state. Correct pattern:
```ts
onCloseRequested(cb) {
  const win = getCurrentWindow();
  let closing = false;
  win.onCloseRequested(async (event) => {
    if (closing) return;             // allow the programmatic close through
    event.preventDefault();          // always prevent first, synchronously
    const allowed = await cb();
    if (allowed) {
      closing = true;
      win.destroy();                 // destroy() bypasses onCloseRequested (no loop); close() would re-fire it
    }
  });
}
```
Apply the same "prevent-first, then act" shape to the `Mod-w` path if it stays.

**Also fix the confirm dialog to honor Cancel (currently impossible to cancel).**
`confirmClose` uses `ask()` (Yes/No) and maps to only `save`/`discard` — the
`cancel` branch the session logic supports can never be reached, so a user who
opens the close dialog is forced to either save or discard. The PRD calls for
Save / Don't save / **Cancel**. Since Tauri's native `ask` is two-button,
implement the three-choice dialog as a small in-app HTML modal (structural only;
plan 005 skins it) returning `'save' | 'discard' | 'cancel'`, OR — acceptable
MVP fallback — layer two native dialogs (first `ask` "Save changes?" → Yes/No,
then only on the path that needs it a `confirm` for Cancel); if you take the
fallback, note it. The in-app modal is preferred and simpler to reason about.

**Verify after fixes (Step 6 smoke re-run, report each):** empty-state Ctrl+O
opens the dialog; typing shows `*` in the title and reveals nothing broke;
inline title appears on open/drop; Ctrl+S clears `*` and writes the file (check
in another editor, line endings preserved); close-with-unsaved shows
Save/Don't-save/Cancel, and each button does the right thing (save→writes+closes,
don't-save→closes, cancel→stays); Ctrl+W same. Gates unchanged
(`npm run typecheck && npm test && npm run build`). Commit per fix, prefix `004:`.

## Correction round 2 — 2026-07-08 — close still broken: missing window mutate permissions

Round-1 fixes verified in code (set-title permission added, updateState guarded,
global shortcuts, 3-choice modal, prevent-first close pattern). But close STILL
fails: after picking a dialog button the window does not close, and Ctrl+W does
nothing.

**Root cause — same class as Bug A.** Tauri v2 window operations are deny-by-
default. `platform.ts:onCloseRequested` calls `win.destroy()`, and `main.ts`'s
Ctrl+W calls `getCurrentWindow().close()`, but `capabilities/default.json` grants
neither `core:window:allow-close` nor `core:window:allow-destroy`. Both reject
silently (the rejection is swallowed — `destroy()` isn't awaited/caught), so the
window stays open even when `allowed === true`. This mirrors the set-title bug
exactly: a window mutation with no permission.

**Fix:**
1. Add both to the `permissions` array in `src-tauri/capabilities/default.json`:
   `"core:window:allow-close"`, `"core:window:allow-destroy"`.
2. In `platform.ts:onCloseRequested`, await and catch `win.destroy()` so any
   future permission/error surfaces in the console instead of vanishing:
   `try { await win.destroy(); } catch (e) { console.error('destroy failed', e); }`.
3. Sanity: confirm the Ctrl+W path (`getCurrentWindow().close()`) now also works
   — `close()` fires `onCloseRequested`, which runs the guard→modal→destroy flow,
   so it should route correctly once `allow-close`+`allow-destroy` exist.

**Verify (report each):** with unsaved changes, click the window X → modal
appears → "Don't Save" closes the window; repeat → "Save" writes then closes;
repeat → "Cancel" keeps it open; Ctrl+W behaves identically; a clean (saved)
window closes immediately with no modal. If the modal does NOT appear at all,
that's a *different* failure — report it with any console output rather than
guessing. Commit `004: add window close/destroy permissions`.

**Explicitly deferred (NOT plan 004 — routed to their proper plans, do not fix
here):** operator also reported (a) clicks landing ~one line off, (b) long lines
causing horizontal scroll / text clipped at the left edge even fullscreen —
both are editor **layout/line-height/wrapping** issues owned by plan 005 (theme:
readable column, line wrapping, editor chrome); and (c) `**bold**` delimiter
marks not hiding — a live-preview reveal issue owned by plan 003. These are
recorded in plan 005 and a plan 003 follow-up note respectively. Plan 004 closes
on close working + the Step-6 file-ops matrix; it does not own visual polish.

## Review — 2026-07-08

**Verdict: CHANGES REQUESTED — one item (uncommitted dependencies).**

Reviewed range `main..feat/004-file-session` (10 commits). Gates in the working
tree: typecheck PASS, **67/67 tests PASS**, build PASS. Operator confirmed the
full Step-6 matrix works after round 2: empty-state Ctrl+O, typing shows `*`,
inline title on open/drop, Ctrl+S saves and clears `*`, and the 3-choice close
dialog (Save/Don't-save/Cancel) all behave correctly. Verified in detail:
`fileSession.ts` stays pure (no `@tauri-apps` imports); its tests cover the whole
contract (empty, CRLF normalize + save round-trip, dirty edit→undo→save
transitions, `windowTitle` all forms, `inlineTitle` basename extraction); all
three window permissions (`set-title`, `close`, `destroy`) present; `save_atomic`
writes-temp-then-renames in the same dir; close pattern is prevent-first →
`destroy()`.

**Blocking item — required JS dependencies are uncommitted.** `src/session/
platform.ts` imports `@tauri-apps/plugin-dialog`, `plugin-fs`, and
`plugin-opener`, and `package.json` + `package-lock.json` in the working tree
declare them — but those two files are **not committed** on this branch (the
committed `package.json` at HEAD lacks all three). A fresh checkout would
`npm install` without them and fail to build. Gates only pass here because the
working tree has them installed. (The Rust-side plugin crates ARE committed in
`Cargo.toml`/`Cargo.lock`; only the JS side is missing.)

**Correction (executor, one commit `004: commit tauri plugin JS deps`):**
`git add package.json package-lock.json && git commit`. Do NOT commit the
incidental `src-tauri/Cargo.toml` `features = []` whitespace churn (reviewer
will discard it at merge, as in prior plans). Re-run gates to confirm still green.

**Non-blocking notes (recorded, no action):**
- `platform.ts:confirmClose` modal text still reads "Do you want to save changes
  to <file>?" with Save/Don't-Save/Cancel buttons — fine; styling lands in 005.
- `main.ts` Ctrl+W calls `getCurrentWindow().close()` (routes through the
  onCloseRequested guard) rather than `attemptClose()` directly — both reach the
  same modal→destroy path now that permissions exist; acceptable.
- Layout/click-accuracy/line-wrapping and `**bold**` hiding remain routed to
  plans 005 and 003 respectively (see this file's Correction round 2, and the
  amendments in those plans).

Once the deps are committed, plan 004 is DONE and ready to merge.

### Re-review — 2026-07-08 — verdict PASS

Correction landed in `c044adc`: `package.json` + `package-lock.json` at HEAD now
declare `@tauri-apps/plugin-dialog`/`-fs`/`-opener` (committed-state verified via
`git show HEAD:package.json`). Gates green (typecheck / 67 tests / build).
**Plan 004 complete — ready to merge `feat/004-file-session` → `main`.** Plan 005
(theme) is unblocked and now also carries the layout/wrapping/click-accuracy
amendment from 004's smoke; the `**bold**` follow-up remains queued against 003.
