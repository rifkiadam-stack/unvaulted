# Plan 012: Plain-text mode for non-markdown files (.txt renders literal, like Notepad)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. STOP
> conditions are binding. Run `git status` before the completion report and
> include its output. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plans 001–011 must all be DONE in
> `plans/README.md`. `git diff --stat c2ec19d..HEAD -- src/editor.ts
> src/main.ts src/session/fileSession.ts` should be empty; if not, compare the
> "Current state" excerpts below against the live code — on a mismatch, STOP
> and report. `npm test` green before starting (113 tests at plan time).

## Status

- **Priority**: P2
- **Effort**: S/M
- **Risk**: MED (touches editor extension wiring — the app's spine)
- **Depends on**: plans/011-orphan-asset-cleanup.md (DONE)
- **Category**: feature
- **Planned at**: commit `c2ec19d`, 2026-07-18

## Why this matters

Operator decision 2026-07-18: today the editor applies markdown live-preview
to EVERY file regardless of extension. A `.txt` containing `---`, `#`, or
`**` gets visually transformed — and worse, a `.txt` that happens to START
with `---` gets a Properties card, and editing through that card REWRITES the
file's content as normalized YAML. For non-markdown files that is silent data
corruption. The product thesis is "conceptually Notepad": for `.txt`, the
Notepad contract is literal text. Markdown styling is the promise for
markdown files only.

**The rule (locked):** `.md` / `.markdown` (case-insensitive) → markdown mode
(exactly today's behavior). Everything else with a path (`.txt`, unknown
extensions) → plain mode. An UNTITLED buffer (no path yet) → markdown mode
(the product is a markdown editor first); the mode re-evaluates when Save As
gives it a path.

Plain mode = no markdown parsing, no decorations, no Properties card, no
`---` auto-spawn, no image-paste interception. Everything else stays: theme,
fonts, line wrapping, inline title (filename), Ctrl+S/O/F/W, dirty `*`,
close-confirm, drag-drop.

## Current state

- `src/editor.ts` — builds the EditorView; the three markdown-specific
  extensions are hardcoded in the fixed list (lines 12–20):

```ts
// src/editor.ts:9-23 (entire file body)
export function createEditor(parent: HTMLElement, initialText: string, extraExtensions: Extension[] = []): EditorView {
  return new EditorView({
    doc: initialText,
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      editorTheme,
      markdownHighlightStyle,
      unvaultedMarkdown(),
      livePreview(),
      ...extraExtensions
    ],
    parent
  });
}
```

- `src/main.ts` — single caller of `createEditor` (line 285), already uses a
  `Compartment` for the image base path — this is the pattern to copy:

```ts
// src/main.ts:108
const baseCompartment = new Compartment();
// src/main.ts:116-120 (inside loadPath)
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newState.currentText },
      selection: { anchor: endOffset, head: endOffset },
      effects: baseCompartment.reconfigure(uvBasePath.of(dirOf(path)))
    });
// src/main.ts:285-288
view = createEditor(editorContainer, '', [
  updateListener,
  baseCompartment.of(uvBasePath.of(''))
]);
```

- `src/main.ts:253-283` — `updateListener` contains the frontmatter
  auto-spawn (fires when line 1 becomes exactly `---`). Must not fire in
  plain mode.
- `src/main.ts:303-331` — global `paste` listener intercepts clipboard
  images, saves to the asset store, inserts `![[Pasted image ...]]`. Must
  not intercept in plain mode (let the event fall through untouched —
  Notepad-like: nothing happens).
- `src/main.ts:110-126` — `loadPath` places the cursor at
  `frontmatterEndOffset(...)`; meaningless in plain mode (use 0).
- `src/main.ts:128-216` — `doSave` handles Save As for untitled buffers
  (`newState.path = targetPath`); the orphan-image modal logic in it stays
  untouched.
- `src/session/fileSession.ts` — home of pure path helpers (`dirOf` at the
  top of the file); add the new pure helper here. Tests for this module:
  `tests/session/fileSession.test.ts` (model new tests after its existing
  `describe` blocks).
- `tests/editor.test.ts` — only asserts `createEditor` is importable/a
  function and basic doc behavior; keep it green.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Typecheck | `npm run typecheck`                      | exit 0              |
| Tests     | `npm test`                               | all pass (113 + new) |
| Build     | `npm run build`                          | exit 0              |
| Dev run   | `npm run tauri dev`                      | window opens        |

## Scope

**In scope** (the only files you may modify):
- `src/editor.ts`
- `src/main.ts`
- `src/session/fileSession.ts`
- `tests/session/fileSession.test.ts`
- `tests/editor.test.ts` (only if the signature change breaks it)

**Out of scope** (do NOT touch):
- `src/preview/**`, `src/markdown/**`, `src/theme/**` — rendering itself is
  unchanged; we only stop attaching it for non-md files.
- `src-tauri/**` — no backend change. `.txt` stays registered in
  fileAssociations; opening it must keep working.
- `docs/PANDUAN-UNVAULTED.md` — the reviewer updates docs after PASS.

## Git workflow

- Branch: `feat/012-plain-txt` from `main`.
- One commit per step, message prefix `012:` (match `git log` style).
- Do NOT push or merge.

## Steps

### Step 1: Pure mode helper + tests

In `src/session/fileSession.ts` add:

```ts
export function isMarkdownPath(path: string | null): boolean;
// null (untitled) → true; otherwise true iff the path ends in .md or
// .markdown, case-insensitive (".MD", ".Markdown" → true; ".txt", ".text",
// no extension, "note.md.txt" → false)
```

Tests in `tests/session/fileSession.test.ts` (new `describe("isMarkdownPath")`):
null → true; `C:\\notes\\a.md` → true; `a.MARKDOWN` → true; `a.txt` → false;
`a` (no ext) → false; `a.md.txt` → false.

**Verify**: `npm test` → all pass including the 6 new cases.

### Step 2: Make the markdown extension set switchable

- `src/editor.ts`: export a new function
  `export function markdownMode(): Extension[]` returning
  `[markdownHighlightStyle, unvaultedMarkdown(), livePreview()]`, and REMOVE
  those three from `createEditor`'s fixed list (keep `basicSetup`,
  `EditorView.lineWrapping`, `editorTheme`, `...extraExtensions`).
- `src/main.ts`: add `const modeCompartment = new Compartment();` next to
  `baseCompartment`, and a module-level `let markdownActive = true;`.
  In the `createEditor` call, add `modeCompartment.of(markdownMode())` to the
  extras array (untitled starts in markdown mode, per the rule).
- If `tests/editor.test.ts` constructed an editor expecting markdown
  behavior, pass `markdownMode()` through the third argument there; if it
  only checks the export, leave it.

**Verify**: `npm run typecheck` exit 0; `npm test` all pass; `npm run build`
exit 0. Dev run: opening a `.md` file still renders live preview exactly as
before (the compartment initial value covers it — no reconfigure happened
yet).

### Step 3: Switch mode on load and on Save As

Add one small helper in `main.ts`:

```ts
function modeEffectsFor(path: string | null) {
  const md = isMarkdownPath(path);
  markdownActive = md;
  return modeCompartment.reconfigure(md ? markdownMode() : []);
}
```

- `loadPath`: compute `const md = isMarkdownPath(path);` — use
  `const endOffset = md ? frontmatterEndOffset(newState.currentText) : 0;`
  and add `modeEffectsFor(path)` to the dispatch's `effects` (alongside the
  existing `baseCompartment.reconfigure(...)` — effects accepts an array).
- `doSave`: after `newState.path = targetPath;`, if
  `isMarkdownPath(targetPath) !== markdownActive`, dispatch
  `view.dispatch({ effects: modeEffectsFor(targetPath) })` (covers untitled →
  Save As `.txt`, and editing a `.txt` then Save As `.md`).

**Verify**: dev run — (a) open a `.txt` containing `---`, `# judul`,
`**bold**` → ALL render as literal text, no HR, no heading, no Properties
card; (b) open a `.md` → full live preview; (c) drag-drop a `.txt` → literal;
(d) new untitled buffer renders markdown, Save As `nota.txt` → rendering
switches to literal in place.

### Step 4: Gate the markdown-only behaviors

- Frontmatter auto-spawn in `updateListener`: wrap the auto-spawn block
  (the `if (state.doc.lines >= 1 && frontmatterEndOffset(newText) === 0)`
  section) with `if (markdownActive) { ... }`. The dirty-tracking part above
  it stays unconditional.
- Paste listener: at the top of the image-item branch, before
  `e.preventDefault()`, add `if (!markdownActive) return;` (whole listener
  can simply return early before the loop — no interception, no file saved,
  Notepad-like no-op).

**Verify**: dev run — in a `.txt`: typing `---` as line 1 does NOT spawn a
frontmatter block; pasting an image does nothing (no file appears in
`Pictures\Unvaulted`). In a `.md`: both behaviors still work.

## Test plan

- New: `isMarkdownPath` cases (Step 1 — the only new pure logic).
- Existing 113 tests must stay green untouched — they exercise the markdown
  pipeline directly (states built with explicit extensions), not via
  `createEditor`, so Step 2's restructure must not affect them. If any test
  DOES break because it relied on `createEditor` including markdown, fix by
  passing `markdownMode()` as extras in that test — never by weakening the
  assertion.
- Manual smoke matrix is in Steps 3–4 verifies.

## Done criteria

- [ ] `npm run typecheck` && `npm test` && `npm run build` all exit 0
- [ ] `isMarkdownPath` tests cover the 6 listed cases
- [ ] Dev smoke: `.txt` literal (no HR/heading/Properties/auto-spawn/paste),
      `.md` unchanged, untitled→Save As `.txt` switches in place
- [ ] `git status` clean; output included in the report

## STOP conditions

- Any file besides `main.ts`/`tests` turns out to call `createEditor`
  (grep first: `createEditor` should appear only in `src/editor.ts`,
  `src/main.ts`, `tests/editor.test.ts`).
- Existing preview/decoration tests fail after Step 2 — that means they DID
  depend on `createEditor`'s fixed list; STOP and report which, do not
  rewrite decoration tests.
- The mode switch appears to need changes inside `src/preview/**` — it must
  not; the whole point is detach-at-the-editor, not flags inside widgets.

## Maintenance notes

- `markdownActive` + `modeCompartment` in `main.ts` is the single seam for
  per-file-type behavior; a future "force markdown for this txt" toggle
  would reconfigure the same compartment.
- Reviewer: scrutinize that plain mode still keeps theme/wrapping (only the
  three markdown extensions live in the compartment), and that the paste
  gate returns BEFORE `preventDefault`.
- Docs follow-up (reviewer, post-merge): PANDUAN-UNVAULTED.md needs a short
  note that `.txt` renders literal by design.
