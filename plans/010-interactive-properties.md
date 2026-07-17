# Plan 010: Interactive Properties editor (Obsidian-like)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. STOP
> conditions are binding. Run `git status` before the completion report and
> include its output. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plan 009 must be DONE. `src/preview/widgets/
> properties.ts` must exist (read-only card), `src/session/fileSession.ts` must
> export `frontmatterEndOffset`. `npm test` green (90 tests at plan time). If
> `src/session/frontmatterEdit.ts` exists, STOP and report.

## Status

- **Priority**: P2
- **Effort**: M/L (hardest UI feature to date — editable widget inside CM)
- **Risk**: MED-HIGH (widget/focus lifecycle; document round-trip edits)
- **Depends on**: plans/009-polish-and-file-types.md
- **Category**: feature
- **Planned at**: stamp `git rev-parse --short HEAD` of main at branch time

## Why this matters

Operator request (2026-07-07, deferred to backlog then): the Properties card is
read-only; editing frontmatter means editing raw YAML. Wanted: Obsidian-like
interactive editing — click a value to edit it, add properties from a LIMITED
key set, Obsidian date formats, and auto-spawn of the properties block when
typing `---` on the first line. The operator uses this daily for skill-notes.

## Product decisions (locked, from the operator)

- **Allowed keys in the "Add property" dropdown (exactly these 7):**
  `trigger, tags, created, updated, type, title, sources`.
- **Existing keys in a file that are NOT in that set (e.g. `related`) must
  still render and remain editable as text — never dropped or destroyed.**
  The limitation applies to ADDING new keys only.
- `created`/`updated` use Obsidian's date format `YYYY-MM-DD`; when added via
  the dropdown they prefill today's date.
- `tags` and `sources` are LIST values (YAML list lines); edited as
  comma-separated text in the UI, serialized back to list form.
- Typing `---` as the first line of a document with no frontmatter auto-creates
  the block (closing fence) and shows the card, like Obsidian.

## Current state (verify before starting)

- `src/preview/widgets/properties.ts` — `PropertiesWidget` renders a read-only
  card (`uv-properties`, header, `uv-property-row` key/value pairs, list values
  as `uv-property-chip`s) from the raw frontmatter text; reveal-on-cursor shows
  raw YAML (keep this behavior).
- `src/session/fileSession.ts` — `frontmatterEndOffset(text)` exists (009).
- Decorations rebuild on doc/selection/tree/effect changes
  (`livePreview.ts`); widgets have `eq()` — a widget is NOT rebuilt while the
  document is unchanged. This is the foundation of the focus design below.

## Design — the focus-safety rule

Inputs live INSIDE the widget DOM. While the user types in an input, the
document must NOT change (no dispatch per keystroke) — otherwise the
decoration rebuild destroys the input mid-typing. Therefore:

- Editing is LOCAL to the input. Commit happens ONCE, on Enter or blur, as a
  single dispatch replacing the frontmatter region's text. Escape cancels.
- The widget's `eq()` compares the frontmatter source text — unchanged doc →
  widget instance survives → input keeps focus. After commit, a rebuild is
  expected (edit session is over; focus loss is fine).
- All interactive elements need the widget's `ignoreEvent()` to return `true`
  (the plan-003 checkbox lesson) so clicks/keys reach the inputs, not CM.

## Scope

**In scope:** `src/session/frontmatterEdit.ts` (new, pure),
`src/preview/widgets/properties.ts` (interactivity), `src/main.ts` or a small
editor extension for the `---` auto-spawn, `src/theme/theme.css` (structural +
skin for inputs/dropdown/buttons), tests
(`tests/session/frontmatterEdit.test.ts` new; extend
`tests/preview/properties.test.ts`).

**Out of scope:** nested YAML beyond one level (unknown complex values render
as read-only raw rows — exactly as today); property re-ordering UI; renaming
keys; `related` wikilink chips-with-links (stays plain text); any settings.

## Steps (one commit per step, prefix `010:`)

### Step 1: Pure frontmatter edit model + tests (the foundation)

`src/session/frontmatterEdit.ts`:

```ts
export type PropValue = { kind: "scalar"; value: string }
                      | { kind: "list"; items: string[] }
                      | { kind: "raw"; lines: string[] };   // unknown/complex — preserved verbatim
export interface PropEntry { key: string; value: PropValue; }
export function parseFrontmatterBlock(text: string): PropEntry[] | null;
  // input: the full document text; parses ONLY the leading frontmatter region
  // (reuse frontmatterEndOffset); null if no frontmatter
export function serializeFrontmatter(entries: PropEntry[]): string;
  // produces the full block INCLUDING both --- fences, trailing newline
export function setProp(entries: PropEntry[], key: string, v: PropValue): PropEntry[];
export function removeProp(entries: PropEntry[], key: string): PropEntry[];
export function addProp(entries: PropEntry[], key: string): PropEntry[];
  // appends with a sensible empty value: created/updated → today's YYYY-MM-DD
  // scalar; tags/sources → empty list; others → empty scalar
export const ALLOWED_KEYS = ["trigger","tags","created","updated","type","title","sources"] as const;
export function todayIso(now: Date): string; // YYYY-MM-DD
```

Round-trip guarantee (THE key test): for the operator's real-world block shapes
(scalars, quoted scalars, `[a, b]` inline lists, `- item` list lines, unknown
keys like `related` with quoted wikilinks), `serializeFrontmatter(
parseFrontmatterBlock(doc)!)` must reproduce an equivalent block — and for
`raw` entries, byte-identical lines. Tests: round-trips for each shape;
set/remove/add behaviors; `todayIso` fixed-date; add `created` prefill.

**Verify**: `npm test` all pass.

### Step 2: Editable rows in `PropertiesWidget`

- Clicking a value span swaps THAT row's value area to an `<input>`
  (`uv-prop-input`): text input for scalars; comma-joined text for lists;
  `raw` rows stay read-only (visually marked, tooltip "complex value — edit as
  raw YAML by moving the cursor into the block").
- Commit on Enter/blur: parse → `setProp` → `serializeFrontmatter` → one
  `view.dispatch` replacing `0..frontmatterEndOffset(doc)` with the new block.
  Escape restores the display row without dispatch.
- Per-row remove: an `×` button (`uv-prop-remove`, visible on row hover) →
  `removeProp` → same single-dispatch commit.
- The widget class must implement `ignoreEvent() { return true; }`.
- Tests (headless DOM via the widget's `toDOM()` as in the existing
  properties test): value click swaps in an input with the current value;
  list row input shows comma-joined items; raw row has no input.
  (The dispatch itself is covered by Step 1's pure tests + manual smoke —
  do NOT try to simulate CM view dispatch headlessly.)

**Verify**: `npm test`; manual: edit `title`, Enter → YAML updates, card
re-renders, `*` dirty appears; Escape cancels; `×` removes a key.

### Step 3: "Add property" row

Card footer: `+ Add property` (`uv-prop-add`). Click → a small dropdown
(`uv-prop-add-menu`, plain positioned div — no dependency) listing
`ALLOWED_KEYS` minus keys already present. Select → `addProp` → commit
dispatch → after the rebuild, the new row's input opens for the value
(track "pending focus key" in module state; on next `toDOM` render, if set,
open that row's editor and clear the flag). `created`/`updated` arrive
prefilled with today.

**Verify**: `npm test`; manual: add each key type; dropdown excludes existing;
full set present → menu shows "no more properties".

### Step 4: `---` auto-spawn

In an `EditorView.updateListener` (main.ts or a tiny extension file): when a
doc change makes line 1 exactly `---` AND `frontmatterEndOffset(doc) === 0`
(no complete frontmatter), dispatch ONE insertion completing the block to
`---\n\n---\n` with the cursor left on the middle empty line — the parser then
produces a Frontmatter node and the card appears (empty, with Add property).
Guard: only fire when the change touched line 1; never fire when the doc
already has frontmatter; the completing dispatch must not re-trigger itself
(check before dispatching, not after).

**Verify**: manual — in a new empty buffer type `---` then Enter-free wait:
block completes, card shows. Typing `---` mid-document still makes an HR
(regression: `npm test` HR cases stay green).

### Step 5: Skin + operator smoke

`theme.css`: inputs/dropdown/buttons styled with existing tokens (bg-secondary,
border, accent focus ring); structural sizing so rows don't jump when swapping
display↔input. Operator smoke: (a) edit title/type/trigger scalars; (b) edit
tags as comma list → YAML list lines correct (check via cursor-reveal);
(c) add created → today prefilled, date format kept; (d) remove a key;
(e) `related` (unknown key) renders read-only raw and SURVIVES other edits
byte-identically; (f) `---` on line 1 of a fresh note spawns the card;
(g) typing inside an input never loses focus mid-word; (h) Ctrl+S after edits
saves the updated YAML (verify in another editor).

## Done criteria

- [ ] Gates green (`npm run typecheck && npm test && npm run build`, `cargo check`)
- [ ] Round-trip tests cover every listed shape incl. unknown-key preservation
- [ ] Widget tests cover input swap-in (scalar, list, raw-readonly)
- [ ] Operator smoke (a)–(h) all confirmed
- [ ] `git status` clean; output in the report

## STOP conditions

- Typing in a row input loses focus on each keystroke (the doc is being
  dispatched per keystroke — architecture violation; re-read the focus-safety
  rule, do not work around with refocus hacks).
- The auto-spawn loops or fires on non-first-line `---`.
- Any new dependency seems needed (there is none — the dropdown is a plain div).
- Round-trip of the operator's real frontmatter (use the corpus in
  `tests/markdown/corpus.test.ts` as reference shapes) is lossy for raw rows.

## Maintenance notes

- `frontmatterEdit.ts` is the single place YAML shapes are known; future value
  types (checkbox props, wikilink chips) extend `PropValue`.
- Backlog 011 (orphan cleanup) is independent; execute after this merges.
- Reviewer should scrutinize: unknown-key byte preservation, the single-dispatch
  commit rule, and `ignoreEvent` on the widget.