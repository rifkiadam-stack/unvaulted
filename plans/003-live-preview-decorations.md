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

## Pre-execution review — 2026-07-07

Executor proposed an architecture (`livePreview.ts`, `reveal.ts`, `preview.css`,
`widgets/{inline,links,hr,blockquote,task,callout,properties,table}.ts`) before
starting Step 1. Reviewed against this plan:

**Approved as-is:** file/step mapping is correct for Steps 1–2, 4–6;
`StateField<DecorationSet>` (rather than `ViewPlugin`) is a valid, sensible choice
given block widgets (table/callout/properties) are central here — it preempts the
`ViewPlugin`-fights-block-decorations STOP condition this plan already anticipated.

**Gap found — missing `Image` construct.** The proposed file list has no
`widgets/image.ts` and no mention of the `Image` node anywhere. Per the behavior
spec table (this file, the `Image` row) and the Scope section
(`widgets/ (checkbox, hr, image, table, callout, properties)`), `Image` is a
required construct. The done criteria require every behavior-table row to have
≥1 test — without this, the plan cannot pass its own done criteria.

**Correction:** add `widgets/image.ts` — group it with Step 3 ("Block basics") or
as its own step; either is fine. Implement per the behavior table's `Image` row:

- Block widget (`<img>`) replacing an `Image` node that sits alone on its own
  line (a paragraph containing only the image syntax).
- `src` resolves the image's path/URL against a `basePath` facet — define this
  facet in `livePreview.ts` (or `reveal.ts`/a small shared module) with a default
  of `document.baseURI`; plan 004 will supply the real value (the open file's
  directory) later — this plan just needs the facet to exist with a safe default.
- Reveal behavior: same as other block widgets — showing raw `![alt](url)` syntax
  when the selection touches that line, per the universal reveal principle.
- Test: an `Image` on its own line renders the widget when cursor is elsewhere;
  raw syntax shows when cursor is on that line. Fold into whichever step/file you
  add it to — one commit is fine, does not need its own step number.

No other changes needed. Proceed with Step 1 once this is folded into the plan.

## Correction round 2 — 2026-07-07 — operator smoke-test findings (Step 7)

Operator ran the Step 7 manual smoke on a real document. Confirmed working:
HR widget, typing latency (instant), reveal behavior on blockquotes/callouts/
tables. Three corrections before this plan can close — reference for fidelity
questions: Obsidian's official "Basic formatting syntax" page (help.obsidian.md).

**C1 — List markers are not rendered (plan-spec gap, owned by the plan author).**
The behavior table omitted `BulletList`/`OrderedList` markers entirely, so `- x`
and `* x` lines show raw markers with no live-preview treatment. Required:

- `ListMark` of a bullet item (`-`, `*`, `+`): when not revealed (cursor off the
  line), render as a bullet dot `•` (replace decoration or styled mark, class
  `uv-list-bullet`). Revealed: raw marker shows, per the universal principle.
- `ListMark` of an ordered item (`1.`, `2)`): keep the number visible (Obsidian
  keeps numbers), just add class `uv-list-number` for plan 005 to style.
- Task-list markers are already checkboxes — unchanged; this correction must NOT
  touch the `TaskMarker` path.
- Nested lists: indentation must keep working; no extra work beyond not breaking it.
- Tests: bullet `- x` renders `•` decoration when cursor elsewhere / raw when on
  the line; ordered `1. x` keeps its number; `- [ ] t` still renders a checkbox
  (regression guard).

**C2 — Properties widget lacks the "Properties" header row.** Obsidian's
frontmatter block shows a "Properties" label above the key/value rows. Add a
header row to the widget: class `uv-properties-header`, text `Properties`.
Structural CSS only (layout; colors stay in plan 005). Test: widget DOM contains
the header row.

**C3 — Checkbox click interaction must be verified in the real DOM.** The
headless test proves the toggle transaction; the operator could not yet confirm
click-in-app works. Ensure the checkbox widget's `toDOM` handles clicks properly
(CodeMirror widgets need `ignoreEvent()` returning true for the click to reach
the input, or an explicit mousedown handler that dispatches the toggle). Verify
in the Step 7 re-run: cursor on another line → click the box → `[ ]` ↔ `[x]`
toggles. If clicks are swallowed, fix within `widgets/task.ts` only.

**Not corrections (recorded so they aren't re-reported):**
- `##ADAM` (no space) not becoming a heading is correct CommonMark behavior and
  matches Obsidian; `## ADAM` (with space) is a heading and its `#` marks hide.
- Heading visual sizes (h1 large → h6 small) are plan 005 scope (`uv-h1..h6`
  classes exist; the type scale lands with the theme). The operator should see
  size changes only after plan 005.

One commit per correction (or one combined commit if small), prefix `003:`.
Re-run the Step 7 smoke after; verification gates unchanged
(`npm run typecheck && npm test && npm run build`).

## Correction round 3 — 2026-07-07 — C3 root cause found (reviewer code-read)

Operator re-test results: C1a ✓, C1b ✓. C2 and C3 re-reported as failing; heading
size re-reported (again: not a bug — CodeMirror default heading style until plan
005; recorded in round 2).

**C3 — real defect, exact fix.** `src/preview/widgets/task.ts` has:

```ts
ignoreEvent() {
  return false; // CodeMirror should let events flow to this DOM element
}
```

The comment has the CM6 semantics **backwards**. `ignoreEvent() → true` means
"the editor ignores this event; the widget's DOM handles it natively" (that is
what an interactive checkbox needs — it is also the default when the method is
not overridden). Returning `false` hands the mousedown to CodeMirror, which
places the cursor and swallows the click — exactly the operator's symptom
("clicking only moves the cursor into the box"). **Fix: return `true` (or delete
the override entirely).** One line; touch nothing else in the file. Add/adjust a
test if the harness can simulate it; otherwise the Step 7 manual click is the
verification.

**C2 — no code change.** Reviewer read `widgets/properties.ts`: the
`uv-properties-header` row ("Properties") is correctly implemented. The re-test
failure was almost certainly test setup: frontmatter only parses when `---` is
the **first line of the document** (the operator's doc had other text on line 1),
with a closing `---`, and the widget only renders with the cursor **outside**
the block. Operator will re-test with the exact procedure below. If it still
fails under that procedure, report back — do not change code speculatively.

**Operator re-test procedure (after the C3 fix):**
1. Clear the editor completely (Ctrl+A, Delete).
2. Type exactly, starting at line 1: `---` ↵ `title: Uji` ↵ `tags: [a, b]` ↵ `---` ↵ ↵ `teks bebas`
3. Move the cursor to the last line → a "Properties" card with 2 rows must
   appear (C2).
4. On a new line type `- [ ] tugas` (space inside the brackets is mandatory —
   `- []` is not a task in GFM nor in Obsidian), move the cursor to another
   line, click the checkbox with the mouse → it must toggle to checked and the
   text must become `[x]` (C3).

## Correction round 4 — 2026-07-07 — final smoke results + two structural fixes

Round-3 re-test: **C3 checkbox PASS** (toggle works by mouse). C2 functionally
PASS (widget + "Properties" header render) but visually broken; heading sizes
re-reported a third time. Two final corrections close this plan:

**C4 — Properties widget structural CSS.** Current rendering stacks everything
vertically and the `[a, b]` chips run together reading as "ab". In
`src/preview/preview.css` (structural only — no colors, plan 005 owns those):

- `.uv-property-row`: horizontal flex; key column fixed-ish width (e.g.
  `flex: 0 0 30%`), value fills the rest. Rows read `title | Uji`.
- `.uv-property-chip`: `display: inline-block` + horizontal padding + right
  margin so `a` and `b` are visibly separate chips.
- `.uv-properties`: card padding + a 1px border so the block reads as one unit;
  `.uv-properties-header`: slightly bolder/spaced label row.

Test: extend the existing properties widget DOM test to assert each
`uv-property-row` contains exactly one `uv-property-key` and one
`uv-property-value` sibling (structure, not pixels).

**C5 — Heading type scale pulled forward from plan 005 (plan-spec change,
owned by the plan author).** Deferring all heading sizing to the theme plan
made live preview untestable by eye — the operator hit this three times.
Structural CSS now includes the scale (values match what plan 005 specifies,
so 005 only re-skins colors/weights): `uv-h1` 1.6em … `uv-h6` 0.9em, bold,
on the heading line's text. The `###` marks continue to hide/reveal as built.
Plan 005's scope note is amended implicitly by this correction: it inherits
the scale instead of introducing it.

One commit (`003: properties layout + heading scale (C4/C5)`), gates unchanged,
then the operator runs one last smoke. After that this plan closes: executor
must also delete `dump_tree.ts`, commit any uncommitted `src/editor.ts` wiring,
and leave the `plans/README.md` status row for the reviewer to set.

**Routing of the operator's feature requests (settled after discussion — do
NOT implement in this plan):**
- *Visually distinct Properties card* (read-only, but clearly set apart from
  normal lines like Obsidian's box): **covered** — C4 above provides the
  structural card; plan 005 provides the Obsidian-like skin. No new plan needed.
- *Inline title* (big read-only title above the note = the file's basename,
  "line 0", change-by-renaming-the-file): moved to **plan 004** as a formal
  amendment there (needs the file session; no filename exists before a file
  can be opened).
- *Interactive Properties editor* (auto-spawn on typing `---` at line 1,
  add-property UI, limited key set `trigger, tags, created, updated, type,
  title, sources`, Obsidian date formats): stays backlog — candidate **plan
  007** after the core series lands; deviates from the PRD's locked
  "Properties read-only in MVP" decision and needs its own design pass.

## Correction round 5 (final) — 2026-07-07 — C6: kill the default heading underline

Round-4 smoke: **C4 PASS** (Properties card renders correctly: header row,
`title | Uji`, separated `a` `b` chips), **C5 PASS** (headings scale up, bold).
One cosmetic leftover: headings also render **underlined** — that comes from
CodeMirror's built-in `defaultHighlightStyle` (bundled via `basicSetup`), which
styles the heading tag with `textDecoration: underline`. The operator wants
bold + size only, no underline (matches Obsidian).

**C6:** in `src/preview/preview.css`, remove the underline on heading lines —
note the default style's underline lives on CodeMirror's own token span, which
may be a *sibling or child* of the `uv-h*` mark span, so target descendants too:

```css
.cm-content :is(.uv-h1,.uv-h2,.uv-h3,.uv-h4,.uv-h5,.uv-h6),
.cm-content :is(.uv-h1,.uv-h2,.uv-h3,.uv-h4,.uv-h5,.uv-h6) * {
  text-decoration: none;
}
```

If the underline survives because the default token span *wraps* (is an
ancestor of) the `uv-h*` span rather than the reverse, the alternative is
overriding at the line level or adjusting how the heading mark is applied — in
that case report what the DOM nesting actually looks like and apply the minimal
working variant. CSS-only change; one commit `003: remove default heading
underline (C6)`. (Plan 005 will replace the default highlight style wholesale;
this rule is the correct interim and harmless afterward.)

After C6 the operator runs one last look; on their confirmation the plan closes
and goes to final review.

## Review — 2026-07-07

**Verdict: CHANGES REQUESTED — one narrow item; everything else is PASS-quality.**

Reviewed range `main..feat/003-live-preview` (11 commits: 7 plan steps across 5
correction rounds, plus the authorized `002-hotfix`). Gates re-run independently:
typecheck PASS, **61/61 tests PASS**, build PASS, `grep fetch(/XMLHttpRequest
src/preview/` = 0 (embeds/wikilinks inert ✓), `grep Decoration src/markdown/` = 0
(parser purity preserved through the hotfix ✓), `dump_tree.ts` deleted ✓,
`src/editor.ts` wiring committed ✓. Operator manually confirmed: checkbox click
toggle, Properties card layout, heading scale, no underline, bullet/ordered
lists, HR, reveal behavior, typing latency.

**Verified in detail:**
- `002-hotfix` (`e39c1e2`): composite-based Frontmatter replaced with
  scan-and-emit `parseBlock` using `cx.prevLineEnd()` — matches the correction's
  suggested shape. `tests/markdown/frontmatter.test.ts` asserts extents exactly
  as specified (`fm.to` ≤ closing-fence end; `ATXHeading1.from > fm.to`).
  Unterminated fence: executor chose the **allowed fallback** (spans to EOF)
  and documented it with a test, per the correction's terms. Accepted; noted
  for a future revisit if it ever bites.
- `corpus.test.ts` change: wikilinks moved from the frontmatter `related:`
  field into body text — correct consequence of the hotfix (frontmatter content
  is no longer parsed as inline markdown; the old assertion only passed
  *because of* the swallow bug). Legitimate.
- `src/env.d.ts` (new, outside the in-scope list): 5-line CSS-module/vite
  type declaration required for the `preview.css` import to typecheck —
  justified consequence of in-scope wiring. Accepted with note.
- `ignoreEvent` override deleted in `task.ts` (one of the two allowed fixes);
  operator confirmed clicks work.

**The one blocking item — checkbox toggle regression test is hollow.**
`tests/preview/blocks.test.ts:39` is titled "renders task checkbox widget and
toggles it" but only asserts the widget exists with `checked=false` — no
toggle, no document-text assertion. Done criterion "Checkbox toggle test proves
document text changes `[ ]` ↔ `[x]`" is therefore unmet, and the test name
overclaims its content.

**Correction (executor, one commit `003: real checkbox toggle test`):**
1. In `src/preview/widgets/task.ts`, extract the change-spec the widget
   dispatches into an exported pure helper, e.g.
   `export function taskToggleChange(checked: boolean, from: number, to: number)`
   returning `{from, to, insert: checked ? "[x]" : "[ ]"}`, and use it in
   `onchange` (behavior identical; no other edits).
2. In `blocks.test.ts`, make the toggle test real: build the state for
   `"- [ ] task"`, apply `state.update({changes: taskToggleChange(true, 2, 5)})`,
   assert the new doc equals `"- [x] task"`; apply the reverse and assert it
   returns. Rename the existing render-only assertion or keep both (render +
   toggle) — but the toggle assertion must exist.
3. Gates green (`npm run typecheck && npm test && npm run build`).

**Non-blocking notes (recorded, no action):**
- Commit-label typos on this branch: `d34c50d "004:"`, `6fe804f "005:"`,
  `7ea6799 "006:"` are plan-003 steps 4–6, not plans 004–006. History is
  immutable-ish here (already reviewed); future plans: prefix is the PLAN
  number, not the step number.
- `task.ts` retains an empty `onmousedown` handler with a stale comment —
  harmless dead weight; may be cleaned opportunistically in plan 005's pass if
  touched, not worth its own commit.
- Five correction rounds on one plan is a signal the original behavior table
  under-specified visuals (lists, structural CSS depth, default-style
  interactions). Lesson folded forward: plan 005 review will include a
  side-by-side fidelity pass rather than construct-by-construct discovery.

### Re-review — 2026-07-07 — verdict PASS

Correction landed in `f41ec13`: `taskToggleChange(checked, from, to)` extracted
and used by the widget's `onchange`; the toggle test now applies the change-spec
both ways and asserts the document text (`"- [x] task"` ↔ `"- [ ] task"`).
Gates re-run: typecheck / tests / build all green. **Plan 003 complete — ready
to merge `feat/003-live-preview` → `main`.** Plan 004 (file session + app shell,
including the inline-title amendment) is unblocked.
