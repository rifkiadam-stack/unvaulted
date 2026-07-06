# Plan 003: Live-preview decoration engine (Obsidian-style rendering in the editor)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: plans 001 and 002 must be DONE in
> `plans/README.md`; `src/markdown/lang.ts` must export `unvaultedMarkdown()`
> and `npm test` must pass before you start. If `src/preview/` already exists,
> STOP and report.

## Status

- **Priority**: P1
- **Effort**: L (the hardest plan in the series — the heart of the product)
- **Risk**: MED (editor behavior; mitigated by headless state tests per feature)
- **Depends on**: plans/002-markdown-extensions.md
- **Category**: feature (core UX)
- **Planned at**: commit `91467ad`, 2026-07-06

## Why this matters

This is what makes Unvaulted "Obsidian, not a plain text editor": **live preview**.
Formatting renders as you type; the raw markdown syntax reveals itself only when the
cursor is on or near the construct. Without this plan the product thesis fails; with
it, an Obsidian user opening a note should think "this is Obsidian's editor."

## Current state

After plans 001–002:

- `src/editor.ts` — `createEditor(parent, initialText)` builds an `EditorView`
  with `basicSetup` + `unvaultedMarkdown()`.
- `src/markdown/lang.ts` — language with GFM + custom nodes: `Highlight`
  (+`HighlightMark`), `Wikilink`, `Embed`, `Tag`, `Frontmatter`.
- `src/markdown/callout.ts` — `parseCalloutHeader(firstLine) → {type,title}|null`.
- Tests are headless Vitest; harness `tests/markdown/harness.ts` shows how to build
  an `EditorState` with the language and force parsing via `ensureSyntaxTree`.

The editor currently shows **raw markdown with no rendering**.

## The behavior spec (Obsidian live-preview rules)

The universal principle — implement it as one reusable predicate:

> A construct renders in its "pretty" form **unless the current selection
> (any cursor or selection range) touches the construct's own line-or-span**,
> in which case the raw syntax is shown for editing.

Reveal granularity: **inline constructs** reveal when the selection overlaps the
construct's `from..to` span (±0 chars); **block constructs** (headings, callout
blocks, frontmatter, tables, images-on-own-line, HR) reveal when the selection
touches any line the block spans.

Per-construct rendering when NOT revealed:

| Construct (node) | Rendered form |
|---|---|
| `StrongEmphasis`, `Emphasis`, `Strikethrough`, `InlineCode`, `Highlight` | styled text (bold/italic/line-through/mono-chip/yellow-bg) with the delimiter marks **hidden** (`**`, `*`, `~~`, `` ` ``, `==`) |
| `ATXHeading1..6` | heading-sized text, `#` marks + trailing space hidden |
| `Link` | only the link text, styled as a link; `[`, `]`, `(url)` hidden; Ctrl+Click opens in system browser (wire an event handler that calls a callback passed into the module — plan 004 connects it to Tauri's opener; default no-op) |
| `Image` (on its own line) | block widget: `<img>` loaded from the path/URL; relative paths resolve against a `basePath` provided by a facet (plan 004 supplies it; default = document.baseURI) |
| `HorizontalRule` | widget: full-width `<hr>`-style line replacing the `---` line |
| `TaskMarker` | checkbox widget replacing `[ ]`/`[x]`; **clicking toggles** the underlying text (dispatch a transaction replacing the marker) even when not revealed |
| `Blockquote` (plain) | styled left-border block; `>` marks hidden |
| Callout (`Blockquote` whose first line matches `parseCalloutHeader`) | block widget wrapper: colored header row (type icon area + title) + body rendered as normal live-preview content; when revealed, raw `> [!type]` lines show |
| `Frontmatter` (doc start) | block widget "Properties": key/value rows parsed line-based (`key: value`; values that are `[a, b]` lists → comma chips); read-only; cursor entering the block reveals raw YAML |
| `Table` | block widget rendering a real `<table>` from the pipe syntax; cursor/selection touching any table line reveals raw pipes for editing |
| `FencedCode` | keep visible fence lines but styled; code body syntax-highlighted (already provided by `codeLanguages` from plan 002); no hiding needed in MVP |
| `Wikilink` `[[t]]`/`[[t\|alias]]` | show `t` (or `alias`) styled like a link but **inert**: not clickable, `cursor: default`, tooltip title "No vault — link disabled"; brackets hidden |
| `Embed` `![[t]]` | inert chip: `t` styled as an embed pill with a small "no vault" hint; never attempts file loading |
| `Tag` `#x` | pill-styled span (background, rounded); **non-clickable**; `#` stays visible inside the pill |

All CSS class names use the prefix `uv-` (e.g. `uv-highlight`, `uv-tag`,
`uv-callout`, `uv-properties`). Plan 005 (theme) styles these classes; this plan
ships only minimal structural CSS (layout, not colors) in `src/preview/preview.css`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass |
| Build | `npm run build` | exit 0 |
| Manual smoke | `npm run tauri dev` | see Step 7 |

No new npm dependencies are expected. If you believe one is required, STOP and report why.

## Scope

**In scope:**
- `src/preview/` (new): `livePreview.ts` (the exported extension bundle),
  `reveal.ts` (selection-overlap predicate), `widgets/` (checkbox, hr, image,
  table, callout, properties), `preview.css` (structural only).
- `src/editor.ts` (modify): add `livePreview()` to the extension list.
- `tests/preview/*.test.ts` (new).

**Out of scope (do NOT touch):**
- `src/markdown/**` parsing (only consume it). If a parse bug blocks you, STOP —
  do not patch the parser in this plan.
- Colors/fonts/theme values (plan 005). File IO/Tauri (`src-tauri/**`, plan 004).
- Editing affordances beyond checkbox toggling (no table editors, no property editors).

## Architecture (how to build it)

One `ViewPlugin` (or `StateField` where widget stability needs it) computes a
`DecorationSet` from the syntax tree of the **visible ranges** + current selection:

- Use `Decoration.mark` for styled inline spans, `Decoration.replace` for hiding
  delimiter marks and for inline widgets, `Decoration.replace({block: true})` (or
  `Decoration.widget({block: true})`) for block widgets (table, properties,
  callout, image, hr).
- `src/preview/reveal.ts`:
  `isRevealed(state: EditorState, from: number, to: number, block: boolean): boolean`
  — implements the universal principle above; every construct handler calls it.
  This is the most test-covered function in the plan.
- Recompute on `docChanged || selectionSet || viewportChanged`.
- Widgets implement `eq()` correctly (compare source text span) so typing elsewhere
  doesn't rebuild them.
- Checkbox toggle: widget renders `<input type="checkbox">`; on change, dispatch
  `{changes: {from, to, insert: checked ? '[x]' : '[ ]'}}` mapped to the marker span.

Keep each widget in its own file under `src/preview/widgets/` — small modules,
uniform shape.

## Steps

Each step = implement + test + one commit (`003: <step title>`).

### Step 1: `reveal.ts` + inline mark styling/hiding

Implement `isRevealed` + the decoration pass for `StrongEmphasis`, `Emphasis`,
`Strikethrough`, `InlineCode`, `Highlight`, `ATXHeading1..6` (styling via
`Decoration.mark` classes `uv-strong`, `uv-em`, `uv-strike`, `uv-code-inline`,
`uv-highlight`, `uv-h1`..`uv-h6`; delimiters hidden via `Decoration.replace`).

Headless tests (`tests/preview/reveal.test.ts`, `inline.test.ts`): build an
`EditorState` with the full extension bundle, place the selection at given
positions, and assert which decorations exist by iterating the `DecorationSet`
(write a small helper `decorationsOf(state)` in `tests/preview/harness.ts` that
returns `[{from, to, kind, class?}]`). Cases: cursor far away → marks hidden;
cursor inside the span → marks visible; selection overlapping the edge → visible.

**Verify**: `npm test` → pass.

### Step 2: Links, wikilinks, embeds, tags

Per the behavior table: `Link` text-only + callback facet `uv-open-external`;
`Wikilink`/`Embed` inert rendering; `Tag` pill. Tests: cursor-away hides
brackets/URL; wikilink alias form shows alias; embed never issues network/file
requests (assert widget has no `src`).

**Verify**: `npm test` → pass.

### Step 3: Block basics — HR, blockquote, task checkboxes

HR widget; blockquote styling with `>` hidden; `TaskMarker` checkbox widget with
toggle-by-click dispatching the text change. Tests: toggling `- [ ]` produces doc
text `- [x]` (dispatch on state, assert new doc); HR line replaced when cursor
away, raw `---` when cursor on the line.

**Verify**: `npm test` → pass.

### Step 4: Callout widget

Detect `Blockquote` whose first content line matches `parseCalloutHeader` (import
from `src/markdown/callout.ts`). Render header row (class `uv-callout`,
`data-callout-type="<type>"`) + body content. Reveal = any selection on the
block's lines. Tests: `> [!note] Title` renders callout decoration; plain
blockquote does not; cursor inside reveals raw.

**Verify**: `npm test` → pass.

### Step 5: Frontmatter Properties widget

For the `Frontmatter` node at doc start: block widget listing `key: value` rows
(line-based parse; `[a, b]` values → chips; nested/complex YAML lines render as
plain text rows). Reveal on cursor entry. Tests: 4-key frontmatter → widget with 4
rows; `related: "[[x]], [[y]]"`-style values remain plain text (no crash); cursor
inside → raw text visible.

**Verify**: `npm test` → pass.

### Step 6: Table widget

Render pipe tables as real `<table>` when selection is outside all table lines;
reveal raw when touched. Column alignment from the delimiter row (`:---`, `:--:`,
`---:`). Inline formatting inside cells may render as plain text in MVP (bold
inside a table cell = nice-to-have; note whichever you implement in your report).
Tests: 2×2 table renders widget; cursor on any table line reveals raw; alignment
attribute set.

**Verify**: `npm test` → pass.

### Step 7: Integration + manual smoke

Wire `livePreview()` into `src/editor.ts`. Run `npm run tauri dev`, paste a rich
document (use the corpus doc from `tests/markdown/corpus.test.ts`), and verify by
hand: everything in the behavior table renders; clicking a checkbox toggles it;
moving the cursor through each construct reveals and re-hides syntax smoothly;
typing feels instant (no visible lag on a ~500-line doc).

**Verify**: report each observation; `npm run typecheck && npm test && npm run build` all exit 0.

## Test plan

`tests/preview/harness.ts` (decoration inventory helper) + one test file per step
as named above. All headless (EditorState-level, jsdom only if widget `toDOM`
needs it — widgets can be constructed without attaching a real view). The manual
smoke in Step 7 is reported, not automated.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; every construct row in the behavior table has ≥1 test
- [ ] `npm run build` exits 0
- [ ] Checkbox toggle test proves document text changes `[ ]` ↔ `[x]`
- [ ] `grep -rn "fetch(\|XMLHttpRequest" src/preview/` returns no matches (embeds/wikilinks stay inert)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plans 001/002 are not DONE, or the node names this plan matches on
  (`Highlight`, `Wikilink`, `Embed`, `Tag`, `Frontmatter`) are absent from the tree.
- Block-widget replacement of multi-line ranges fights CodeMirror (exceptions
  about block decorations from a plugin) — the fix is moving that decoration set
  into a `StateField`; if that *also* fails, STOP with the error.
- Any single step's tests still fail after two focused fix attempts.
- You feel a new dependency is needed.

## Maintenance notes

- Plan 005 styles the `uv-*` classes this plan emits — the class inventory in the
  behavior table is a contract; document any addition in your report.
- Plan 004 supplies the `basePath` facet (image resolution) and the external-link
  opener callback; this plan ships safe defaults.
- Future Tier B (math/mermaid) will follow the same pattern: parser node (002-style)
  + widget (003-style); the architecture should make that additive.
- Reviewer should scrutinize: `eq()` implementations on widgets (perf), and that
  reveal logic reads selection ranges, not just the main cursor.
