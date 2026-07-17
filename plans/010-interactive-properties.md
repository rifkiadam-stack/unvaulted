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

- ~~**Allowed keys in the "Add property" dropdown (exactly these 7):**
  `trigger, tags, created, updated, type, title, sources`.~~
  **REVISED 2026-07-17 (operator, corrections round 1 / C2):** the 7 keys are
  SUGGESTIONS, not a hard limit — free-text key entry is allowed, matching
  Obsidian's real behavior. See C2 below.
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

## Corrections — round 1 (operator smoke, 2026-07-17)

Steps 1–4 reviewed live by the operator. Architecture is sound (focus-safety
rule respected, single-dispatch commits, round-trip model in place) —
**CHANGES REQUESTED** on four points. One commit per correction, prefix `010:`,
on the same `feat/010-properties` branch. Do NOT restructure anything else.

### C1 — Add-property menu is clipped; operator must scroll to read it

The menu is `position: absolute` inside the widget, so it extends into the
CM scroller's overflow instead of floating above it. Fix: on open, set
`position: fixed` and place it from the button's `getBoundingClientRect()`
(below the button; if the viewport space below is too small, open upward).
Give it `max-height` + `overflow-y: auto` as a safety net. Close the menu on:
item select, outside `mousedown`, `Escape`, and window scroll/resize.

### C2 — Free-text keys (product decision revised — see the struck-through
### decision above)

Replace the fixed key list with Obsidian's actual pattern:

- Clicking `+ Add property` opens a small **text input** with the suggestion
  list under it: the 7 former allowed keys minus keys already present,
  filtered live by what's typed (prefix match).
- Clicking a suggestion OR typing any name + Enter → `addProp` with that key
  (then the existing pending-focus flow opens the value input).
- Validate typed keys with `/^[A-Za-z0-9_-]+$/`; ignore duplicates and empty
  input (just don't add — no dialog). Escape closes.
- Rename the constant `ALLOWED_KEYS` → `SUGGESTED_KEYS` (it no longer gates
  anything for adding; update imports and tests). `created`/`updated` prefill
  behavior unchanged; free-text keys get an empty scalar.

### C3 — Unknown keys with SIMPLE shapes must render properly (operator:
### `related` looks broken as a raw blob)

Currently EVERY unknown key falls to `raw`. Change `parseFrontmatterBlock`:
for ANY key (known or unknown), parse `key: value` as scalar and `key:`
followed by `- item` lines as list — the same shapes already handled for
tags/sources. Only genuinely complex values (nested maps, multi-line strings,
deeper indentation) remain `raw` (and keep byte-identical preservation).

Quoting rules (critical for round-trip):
- On parse, strip surrounding quotes from list items too (currently only
  scalars are unquoted) — `- "[[cs50]]"` → item `[[cs50]]`, chip shows clean.
- On serialize, re-quote any scalar or list item that needs it: contains `:`
  or `#`, or starts with `[`, `{`, `-`, `>`, quote, or whitespace. So
  `[[cs50]]` serializes back as `- "[[cs50]]"` — unquoted `[[...]]` is invalid
  YAML and would corrupt the operator's Obsidian notes.

Result: `related` renders as chips like tags and is editable as comma text.
Tests to add: round-trip of the operator's real `related` shape (quoted
wikilink list items) → quotes preserved on output; unknown scalar key is
editable; a nested-map value still parses as `raw` and survives
byte-identically.

### C4 — Undefined CSS tokens (bug found in review, not by the operator)

`theme.css` uses `var(--uv-bg-primary)` and `var(--uv-text-normal)` — neither
token exists (the real tokens are `--uv-bg` and `--uv-text`). That's why the
dropdown has a transparent background. Fix every occurrence; verify in BOTH
dark and light themes.

**Verify after all four**: full gates (`npm run typecheck && npm test &&
npm run build`); operator re-smoke of (a)–(h) plus: menu never clipped, typing
a custom key works, `related` shows chips and round-trips with quotes intact.

**Additional STOP condition**: if the C3 quoting round-trip turns out
ambiguous for some shape in the operator's real notes, STOP and report the
exact input — do not guess a serialization.

## Corrections — round 2 (operator smoke of round 1, 2026-07-17)

C1–C4 re-smoked. C2/C3 confirmed working (free-text input present, `related`
now renders as chips). Three corrections + one plan violation found in code
review. One commit per item, prefix `010:`.

### C5 — Menu closes itself when the operator scrolls INSIDE it

Root cause (properties.ts): `window.addEventListener("scroll", closeMenu,
true)` — the capture listener catches the menu's OWN `overflow-y` scroll, so
wheel-scrolling or dragging the menu's scrollbar instantly closes it. Fix:

- Scroll handler must ignore events originating inside the menu:
  `if (ev.target instanceof Node && menu.contains(ev.target)) return;` —
  outer scrolls still close.
- Also stop forcing the scrollbar to appear at all in normal windows:
  `maxHeight` is hardcoded `200px`, too small for 7 items even when the
  viewport has plenty of room. Compute it from available space instead:
  when opening downward `Math.min(320, spaceBelow - 12)`, when flipped
  upward use the space above the button similarly.

### C6 — C4 was incomplete: `--uv-text-normal` still used in 3 places

`theme.css` still has `var(--uv-text-normal)` (undefined) at
`.uv-prop-remove:hover`, `.uv-prop-input`, and `.uv-prop-add:hover`.
Replace all three with `var(--uv-text)`. Grep the whole file for
`--uv-text-normal` and `--uv-bg-primary` afterwards — result must be zero.

### C7 — White box artifact at the row's right edge (operator screenshot)

On the operator's dark theme, a small WHITE block appears at the right edge
of a property row around the `×` remove button area. Reproduce in dev
(hover the row / focus the button), identify the element, and fix its skin:
at minimum give `.uv-prop-remove` an explicit `appearance: none;
background: transparent;` and re-check after C6 (one undefined token sits on
its hover rule). Also check the menu's native scrollbar styling while at it
(white native scrollbar on dark theme — if C5's sizing doesn't remove it,
style `.uv-prop-add-menu::-webkit-scrollbar` with dark tokens). Report in
the completion note WHICH element it was.

### C8 — PLAN VIOLATION: raw rows are hidden entirely

`theme.css` now contains `.uv-property-raw { display: none; }`. The plan
requires unknown/complex values to RENDER as read-only raw rows — hiding
them means a nested value silently disappears from the card (data intact in
text, but invisible to the operator). Restore visible raw rows (key +
preformatted raw lines, muted styling, the existing tooltip). If the hide
was added to suppress blank-line `__raw_N` artifacts, fix that at the
SOURCE: `parseFrontmatterBlock` should skip lines that are entirely blank
instead of emitting raw entries for them (serializer then simply doesn't
re-emit them — acceptable normalization; add a test: blank line between two
keys → both keys parsed, no raw entry, round-trip drops only the blank
line).

**Verify after all four**: full gates green; operator re-smoke: scroll
inside menu works (wheel + scrollbar drag), no white box, a nested-map
frontmatter value shows as a visible read-only raw row.