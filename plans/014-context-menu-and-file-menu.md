# Plan 014: Right-click context menu, formatting shortcuts, and a File menu

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. STOP
> conditions are binding. Run `git status` before the completion report and
> include its output. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plans 012 and 013 must be DONE in
> `plans/README.md`. `src/editor.ts` must export `markdownMode()`;
> `src/main.ts` must contain `markdownActive` and `modeCompartment`.
> `npm test` green before starting (114 tests at plan time).

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (new UI surfaces + clipboard permissions in WebView2)
- **Depends on**: plans/013-open-dialog-and-associations.md
- **Category**: feature
- **Planned at**: stamp `git rev-parse --short HEAD` of main at branch time

## Why this matters

Operator decisions 2026-07-18 (interview): the app is going to casual users
who don't know markdown syntax or shortcuts. Today right-click shows the
webview's default menu and there is no menu bar at all. Wanted:

1. A custom right-click **context menu** in the editor.
2. **Formatting keyboard shortcuts** (Obsidian-like).
3. A small **File menu** in the header (revises the old "near-zero chrome"
   decision — deliberately, for casual users; keep it to ONE small "File"
   button, not a menu bar).

## Product decisions (locked, operator 2026-07-18)

- **Context menu, markdown mode** (in this order):
  Bold `Ctrl+B` · Italic `Ctrl+I` · Strikethrough `Ctrl+Shift+X` ·
  Highlight `Ctrl+Shift+H` · Insert horizontal rule — separator — Cut ·
  Copy · Paste · Select All — separator — Undo `Ctrl+Z` · Redo `Ctrl+Y`.
- **Context menu, plain mode** (txt/json/…): ONLY Cut · Copy · Paste ·
  Select All — separator — Undo · Redo. No formatting, no HR.
- **Shortcuts** (markdown mode only, via the mode compartment):
  `Ctrl+B` bold, `Ctrl+I` italic, `Ctrl+Shift+X` strikethrough,
  `Ctrl+Shift+H` highlight.
- **File menu** (header, top-left): Open `Ctrl+O` · Save `Ctrl+S` ·
  Save As `Ctrl+Shift+S`. Shortcut hints shown right-aligned in the items.
- **`Ctrl+Shift+S` must actually work** — recon found it is NOT currently
  bound (the keydown handler at `src/main.ts:233-251` only handles
  `isMod && !e.shiftKey`). Add a real Save As.
- Undo/redo already work via CodeMirror history (`basicSetup`); the menu
  only exposes them (`undo`/`redo` from `@codemirror/commands` — already an
  installed transitive dependency of the `codemirror` package; importing it
  is NOT a new dependency).

## Current state

- `src/main.ts:233-251` — global keydown: `Ctrl+S/O/W`, explicitly skips
  `e.shiftKey`. `doSave()` at lines 128-216 shows the save dialog only when
  `session.path` is empty.
- `src/main.ts:42-58` — header: `uv-app-header` div containing ONLY the
  theme toggle; `theme.css` `.uv-app-header { justify-content: flex-end; }`.
- `src/editor.ts` — `markdownMode(): Extension[]` (three markdown
  extensions) + `createEditor` (basicSetup, lineWrapping, editorTheme,
  extras). The mode compartment in main.ts swaps `markdownMode()` ↔ `[]`.
- `src/preview/widgets/properties.ts` — the Properties card contains real
  `<input>` elements inside the editor DOM. Their native context menu must
  keep working.
- Menu skin precedent: `.uv-prop-add-menu` / `.uv-prop-menu-item` in
  `theme.css` (fixed positioning, flip-when-near-edge, close on outside
  mousedown/Escape, ignore scrolls originating inside — the plan-010 C1/C5
  lessons; copy that behavior).
- Existing clipboard use: the `paste` EVENT handler (`main.ts:303+`).
  Menu-driven Paste must instead READ the clipboard
  (`navigator.clipboard.readText()`) — WebView2 normally allows it in a
  user-gesture context, but this is the plan's main risk (see STOP).

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0              |
| Tests     | `npm test`          | 114 + new all pass  |
| Build     | `npm run build`     | exit 0              |
| Dev run   | `npm run tauri dev` | window opens        |

## Scope

**In scope** (the only files you may modify/create):
- `src/editing/format.ts` (new — pure formatting commands)
- `src/ui/menus.ts` (new — shared dropdown builder + context menu + File menu wiring)
- `src/editor.ts` (add the formatting keymap into `markdownMode()`)
- `src/main.ts` (doSaveAs, Ctrl+Shift+S, header File button, context-menu hookup)
- `src/theme/theme.css` (menu + header skin)
- `tests/editing/format.test.ts` (new)

**Out of scope** (do NOT touch):
- `src/preview/**`, `src/markdown/**` — no rendering changes.
- `src-tauri/**` — no new plugins, no Rust changes. Clipboard goes through
  the web API only.
- The `paste` EVENT handler for images — unchanged.

## Git workflow

- Branch: `feat/014-menus` from `main`.
- One commit per step, prefix `014:`.
- Do NOT push or merge.

## Steps

### Step 1: Pure formatting commands + tests

New `src/editing/format.ts`:

```ts
import { EditorView } from "@codemirror/view";
export function toggleInline(marker: string): (view: EditorView) => boolean;
  // marker: "**" | "*" | "~~" | "=="
  // For each selection range (use changeByRange):
  // - empty range → insert marker+marker, cursor between them
  // - selected text starts AND ends with marker → strip it (unwrap)
  // - chars immediately around the range equal marker → strip those (unwrap)
  // - otherwise wrap the selection
export function insertHorizontalRule(view: EditorView): boolean;
  // insert a "---" on its own line below the current line
  // (insert "\n---\n" at the end of the main selection's line), cursor after it
export const toggleBold / toggleItalic / toggleStrike / toggleHighlight;
  // = toggleInline("**") etc., exported for keymap + menu reuse
```

Tests in `tests/editing/format.test.ts` — headless pattern (no DOM): build
an `EditorState`, run the command with a fake view target:

```ts
let state = EditorState.create({ doc, selection });
const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
toggleBold(target as any);
expect(state.doc.toString()).toBe(...);
```

Cases: wrap selection; unwrap when text selected WITH markers; unwrap when
markers sit just outside the selection; empty selection inserts pair with
cursor centered (assert `state.selection.main.head`); italic wrap on
already-bold text produces `***x***`; HR inserted below current line.

**Verify**: `npm test` → all pass.

### Step 2: Formatting shortcuts inside markdownMode + real Save As

- `src/editor.ts`: add to `markdownMode()`'s returned array a
  `keymap.of([...])` (import `keymap` from `@codemirror/view`,
  `Prec.high(...)` from `@codemirror/state` around it so it beats defaults):
  `Mod-b` → toggleBold, `Mod-i` → toggleItalic, `Mod-Shift-x` →
  toggleStrike, `Mod-Shift-h` → toggleHighlight. Living inside
  `markdownMode()` makes them automatically markdown-only — do NOT add a
  separate markdownActive check.
- `src/main.ts`: refactor `doSave` minimally to
  `doSave(forceDialog = false)` — when `forceDialog`, always call
  `platform.showSaveDialog()` even if `session.path` exists (the rest of the
  body, including the orphan-image modal and the 012 mode switch, is shared
  and unchanged). Add `case 's'` in a NEW `isMod && e.shiftKey` branch of
  the existing keydown handler calling `doSave(true)`.

**Verify**: gates green. Dev: in a `.md` — select text, `Ctrl+B` → `**x**`,
again → unwrapped; `Ctrl+Shift+X`/`Ctrl+Shift+H` work; in a `.txt` all four
do nothing. `Ctrl+Shift+S` on an already-saved file opens the Save dialog.

### Step 3: Shared menu builder + right-click context menu

New `src/ui/menus.ts`:

- `showMenu(items, x, y)` — builds a fixed-position `.uv-menu` div at the
  given coordinates; items are `{ label, hint?, action }` or `"---"`
  (separator, `.uv-menu-sep`). Behavior copied from the plan-010 lessons:
  flip up/left when near viewport edges; `max-height` from available space;
  close on item click, outside `mousedown`, `Escape`, resize, and scrolls
  NOT originating inside the menu.
- `installContextMenu(view, opts)` — `contextmenu` listener on
  `view.dom`. **Exception first**: if `event.target` is an `INPUT`/
  `TEXTAREA` or sits inside a `.uv-properties` element, return WITHOUT
  `preventDefault()` (native menu for the Properties inputs). Otherwise
  `preventDefault()` and `showMenu` with:
  - markdown-mode-only group (query `opts.isMarkdown()` at open time —
    wire it to `() => markdownActive` from main.ts): Bold (`Ctrl+B`),
    Italic (`Ctrl+I`), Strikethrough (`Ctrl+Shift+X`), Highlight
    (`Ctrl+Shift+H`), Insert horizontal rule, then a separator;
  - always: Cut, Copy, Paste, Select All, separator, Undo (`Ctrl+Z`),
    Redo (`Ctrl+Y`).
  - Actions: Cut/Copy → `navigator.clipboard.writeText(selectedText)`
    (+ delete selection for Cut; empty selection → no-op). Paste →
    `navigator.clipboard.readText()` then `replaceSelection`; on rejection,
    `console.warn` and do nothing (see STOP). Select All →
    `selectAll` command; Undo/Redo → `undo`/`redo` from
    `@codemirror/commands`. Focus the editor after every action.

Skin in `theme.css`: `.uv-menu`, `.uv-menu-item`, `.uv-menu-item:hover`
(accent bg like `.uv-prop-menu-item:hover`), `.uv-menu-sep`,
`.uv-menu-hint` (right-aligned, `--uv-text-muted`, smaller). Tokens only —
verify BOTH themes.

**Verify**: gates green. Dev: right-click in a `.md` → full menu, every
item works; right-click in a `.txt` → edit-only menu; right-click a
Properties value input → NATIVE menu appears; menu near the bottom edge
flips upward; Escape/outside-click closes.

### Step 4: File menu in the header

- `main.ts`: add a `File` button (`uv-file-btn`) as the FIRST child of the
  header row; clicking opens `showMenu` (same builder) anchored below it:
  Open (`Ctrl+O`) → `doOpen()`, Save (`Ctrl+S`) → `doSave()`, Save As
  (`Ctrl+Shift+S`) → `doSave(true)`.
- `theme.css`: `.uv-app-header` switches to `justify-content:
  space-between`; `.uv-file-btn` styled like `.uv-prop-add` (transparent,
  muted, hover bg-secondary). Theme toggle stays top-right, unmoved.

**Verify**: gates green. Dev: File menu opens/closes cleanly, all three
actions work, theme toggle still in place, layout unshifted otherwise
(inline title/editor position unchanged).

### Step 5: Operator smoke

(a) All four formatting shortcuts + toggle-off in `.md`; inert in `.txt`.
(b) Context menu full vs edit-only per mode; Paste works (or is reported).
(c) HR inserted below the current line renders as a rule.
(d) Native menu still available inside Properties inputs.
(e) File → Open/Save/Save As all work; `Ctrl+Shift+S` too.
(f) Both themes: menus readable, hints muted, hover accent.
(g) Undo/Redo from the menu reverse/replay edits made via the menu itself.

## Test plan

- `tests/editing/format.test.ts` (Step 1) — the only new pure logic.
- Menus are DOM+integration; covered by the Step 3/4/5 manual matrix (same
  policy as the plan-010 widget UI — do not simulate CM view dispatch
  headlessly).
- All 114 existing tests stay green.

## Done criteria

- [ ] Gates green (`npm run typecheck && npm test && npm run build`)
- [ ] format.test.ts covers wrap/unwrap/empty-cursor/bold+italic-nesting/HR
- [ ] Operator smoke (a)–(g) confirmed
- [ ] No new entries in `package.json` dependencies (`git diff package.json`
      empty)
- [ ] `git status` clean; output in the report

## STOP conditions

- `navigator.clipboard.readText()` is rejected/blocked by WebView2 in dev:
  remove the Paste ITEM (keep Cut/Copy — `writeText` is separately
  permitted), report the observed error verbatim, and continue. Do NOT add
  the Tauri clipboard plugin or any dependency to work around it.
- Any temptation to modify `src/preview/**` or the image-paste event
  handler.
- The context menu intercepts right-clicks inside Properties inputs (it
  must not — that breaks native text editing there).
- Formatting shortcuts appear to need a `markdownActive` check in the
  keymap — they must not; placement inside `markdownMode()` IS the gate.

## Maintenance notes

- `showMenu` in `src/ui/menus.ts` is the single dropdown primitive; the
  plan-010 add-property menu could migrate to it later (do NOT do it now).
- Reviewer post-merge: add context-menu + File-menu + new shortcuts to
  `docs/GUIDE.md` and the README feature list; rebuild installer + refresh
  `installer/`.
- If a future plan adds tabs/multi-file, the File menu is where "New
  Window" would land (deferred by operator choice).
