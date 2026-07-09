# Plan 005: Obsidian default theme (dark + light, follows OS)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: plans 001–003 must be DONE in `plans/README.md`;
> `src/preview/` must exist and emit the `uv-*` classes listed below;
> `npm test` must pass before you start. If `src/theme/` already exists, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (pure presentation; no behavior changes)
- **Depends on**: plans/003-live-preview-decorations.md
- **Category**: feature (visual fidelity)
- **Planned at**: commit `91467ad`, 2026-07-06

## Why this matters

The product's acceptance test is emotional: an Obsidian user opens a note in
Unvaulted and thinks *"oh, this is Obsidian — just the Notepad version."* That
reaction is produced almost entirely by visual fidelity to **Obsidian's default
theme**: its dark and light palettes, type scale, callout colors, tag pills,
highlight yellow. This plan skins the structural classes plan 003 created. There is
deliberately **no settings screen and no theme customization** — the app follows the
OS dark/light preference, nothing else.

## Current state

After plans 001–003:

- `src/preview/preview.css` — structural CSS only (layout, no colors/fonts).
- The live-preview engine emits these class names (the contract from plan 003):
  `uv-strong`, `uv-em`, `uv-strike`, `uv-code-inline`, `uv-highlight`,
  `uv-h1`…`uv-h6`, link styling on rendered links, `uv-tag`, wikilink/embed inert
  styles, `uv-callout` (+ `data-callout-type`), `uv-properties`, table widget,
  HR widget, checkbox widget, `uv-empty-hint` (if plan 004 landed).
  **Verify the real inventory first**: `grep -rhoE "uv-[a-z0-9-]+" src/ | sort -u`
  and style what actually exists; report any class this plan doesn't cover.
- CodeMirror is built from `basicSetup` — still on its default light editor chrome.

## Design tokens (the spec)

Define everything as CSS custom properties on `:root` (dark is the reference
palette; light overrides). Values below approximate Obsidian's default theme —
they are the starting point; final fidelity is judged by human side-by-side review
(Step 5), so implement exactly these first, then adjust only what the review flags.

```css
:root {            /* dark (default reference) */
  --uv-bg:            #1e1e1e;
  --uv-bg-secondary:  #262626;
  --uv-text:          #dadada;
  --uv-text-muted:    #999999;
  --uv-text-faint:    #666666;
  --uv-accent:        #8a5cf5;   /* Obsidian purple */
  --uv-link:          #8a5cf5;
  --uv-highlight-bg:  rgba(255, 208, 0, 0.4);
  --uv-code-bg:       #2a2a2a;
  --uv-border:        #3f3f3f;
  --uv-selection:     rgba(138, 92, 245, 0.30);
  --uv-hr:            #3f3f3f;
  /* callout accents, used with data-callout-type */
  --uv-callout-note:     #448aff;
  --uv-callout-info:     #00b8d4;
  --uv-callout-tip:      #00bfa5;
  --uv-callout-success:  #09ad7a;
  --uv-callout-question: #dba642;
  --uv-callout-warning:  #ec7500;
  --uv-callout-danger:   #e93147;
  --uv-callout-quote:    #9e9e9e;
}
@media (prefers-color-scheme: light) { :root {
  --uv-bg:            #ffffff;
  --uv-bg-secondary:  #f6f6f6;
  --uv-text:          #222222;
  --uv-text-muted:    #808080;
  --uv-text-faint:    #aaaaaa;
  --uv-accent:        #7b52ee;
  --uv-link:          #7b52ee;
  --uv-highlight-bg:  rgba(255, 208, 0, 0.4);
  --uv-code-bg:       #f0f0f0;
  --uv-border:        #e0e0e0;
  --uv-selection:     rgba(123, 82, 238, 0.20);
  --uv-hr:            #e0e0e0;
  /* callout colors stay the same in light mode */
}}
```

Typography & metrics:

- UI/body font: `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
  at 16px, line-height 1.6.
- Monospace (inline code, fences, revealed syntax): `Consolas, "Cascadia Code", Menlo, monospace`.
- Heading scale (em, bold): h1 1.6, h2 1.4, h3 1.25, h4 1.1, h5 1.0, h6 0.9 muted.
- Content column: max-width 44rem, centered, generous top padding (~2rem) — the
  Obsidian "readable line length" feel.
- Checkbox accent-color: `--uv-accent`. Tag pill: `--uv-accent`-tinted bg at ~12%
  opacity, text `--uv-accent`, radius 1em, padding 0.1em 0.6em.
- Callout box: left-accent + `color-mix(in srgb, var(--uv-callout-<type>) 10%, transparent)`
  background; header text in the callout color, bold.
- Properties block: `--uv-bg-secondary` card, `--uv-border` 1px, muted keys /
  normal values, small (0.875em).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass |
| Build | `npm run build` | exit 0 |
| Manual review | `npm run tauri dev` | Step 5 |

No new npm dependencies. (Syntax highlighting inside code fences: build a
`HighlightStyle` over `@lezer/highlight` tags — both packages are already present
transitively; add explicit deps only if imports fail, and record it.)

## Scope

**In scope:**
- `src/theme/theme.css` (new) — tokens + all `uv-*` skinning.
- `src/theme/editorTheme.ts` (new) — `EditorView.theme` (editor chrome: bg, caret,
  selection, gutters hidden, scrollbar) + `HighlightStyle`/`syntaxHighlighting`
  for revealed-markdown syntax and fenced-code tokens, both reading the CSS
  variables where possible (CM theme values accept `var(--uv-…)`).
- `src/editor.ts` (modify) — add the theme extension.
- `src/main.ts` or `index.html` (modify) — import `theme.css`; set root
  `color-scheme: dark light`.
- `tests/theme/tokens.test.ts` (new).

**Out of scope (do NOT touch):**
- Any behavior/decoration logic (`src/preview/**` logic, `src/markdown/**`,
  `src/session/**`, `src-tauri/**`).
- Settings UI, theme toggle, custom fonts loading, custom CSS support — all
  rejected by design. The ONLY switch is `prefers-color-scheme`.

## Steps

### Step 1: Token sheet + base editor chrome

Create `theme.css` with the token block above + body/app baseline (bg, text,
font). Create `editorTheme.ts` with `EditorView.theme({...})`: content font/size,
caret color `--uv-text`, selection `--uv-selection`, no line-number gutter (remove
`lineNumbers` if `basicSetup` brought it — Notepad-like: no gutters), readable
column via `.cm-content` max-width + auto margins. Wire into `createEditor`.

**Verify**: `npm run build` exit 0; dev app shows dark editor with centered column.

### Step 2: Inline & heading skin

Style `uv-h1..h6` scale, `uv-strong/em/strike`, `uv-code-inline` (code-bg chip),
`uv-highlight` (highlight-bg), links (`--uv-link`, underline on hover only),
wikilink/embed inert styles (link color but `cursor: default`; embed pill),
`uv-tag` pill per spec.

**Verify**: `npm run build` exit 0; visual check against a rich doc.

### Step 3: Block skin

Blockquote (3px `--uv-border` left bar, muted text), HR (`--uv-hr` 1px), table
widget (collapsed borders `--uv-border`, header row `--uv-bg-secondary`, cell
padding 0.4em 0.8em), callout boxes per spec (all eight `data-callout-type`
values), Properties card per spec, checkbox accent, empty-state hint
(`--uv-text-faint`, centered).

**Verify**: `npm run build` exit 0.

### Step 4: Syntax `HighlightStyle`

Two concerns: (a) revealed markdown syntax marks (when cursor is inside a
construct) render in `--uv-text-faint` so raw `**`/`==`/`#` reads as scaffolding;
(b) fenced-code tokens get a palette: keywords `#c678dd`, strings `#98c379`,
comments `#7f848e` italic, numbers/atoms `#d19a66`, functions `#61afef`,
types/classes `#e5c07b`, props `#e06c75` (One-Dark-adjacent — matches Obsidian's
default code feel; same palette both modes is acceptable for MVP, note it).

**Verify**: `npm test && npm run build` exit 0; code fence in dev app is colored.

### Step 5: Side-by-side fidelity review (human-in-the-loop)

Open the same rich note in real Obsidian (default theme, dark then light — flip
Windows dark mode to test OS-follow) and in Unvaulted. Compare: background, text,
headings, links/wikilinks, tags, highlight, callouts (note/warning/danger at
minimum), table, properties, code fence. Adjust only tokens that visibly diverge;
list every adjusted token + final value in your report. **This step requires the
operator to look** — present both windows and ask for verdict; their "familiar
immediately" is the acceptance bar.

**Verify**: operator confirms; `npm run typecheck && npm test && npm run build` all exit 0.

## Test plan

`tests/theme/tokens.test.ts` — automated sanity, not pixel-perfection:

1. Parse `src/theme/theme.css` (read as text): assert every token in the spec's
   dark block exists, and the light `@media (prefers-color-scheme: light)` block
   overrides at least `--uv-bg`, `--uv-text`, `--uv-link`.
2. Assert every `uv-*` class found by `grep -rhoE "uv-[a-z0-9-]+" src/preview/ src/main.ts`
   (compute the inventory in the test via `fs` + regex over source files) appears
   at least once in `theme.css` — no unstyled structural class ships.
3. `editorTheme.ts` exports are importable and non-empty arrays/extensions.

Visual fidelity itself is Step 5 (human review) — deliberately not automated.

## Done criteria

- [ ] `npm run typecheck`, `npm test`, `npm run build` all exit 0
- [ ] `tokens.test.ts` proves: all spec tokens present; light overrides present;
      every emitted `uv-*` class styled
- [ ] No gutters/line numbers in the editor (Notepad feel)
- [ ] OS dark/light switch flips the app without restart (manual, reported)
- [ ] Operator sign-off on the side-by-side review recorded in the report
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plans 001–003 not DONE, or the `uv-*` inventory grep returns classes whose
  purpose you cannot determine from `src/preview/` source (report the list).
- CodeMirror theme values reject `var(--…)` for some property you need (use the
  literal from the token spec there and note each occurrence — more than 5 such
  hardcodes means something's wrong: STOP).
- `color-mix()` is unsupported by the shipped WebView2 (very unlikely on
  evergreen WebView2; fallback: pre-computed rgba values — note them).

## Maintenance notes

- The token sheet is the single source of visual truth — future theme work
  (user accents, community themes) starts by widening this file, not by touching
  widgets.
- If plan 003 later adds classes (e.g. Tier B math), `tokens.test.ts` check #2
  fails by design — that's the reminder to style them.
- Reviewer should scrutinize: no behavior diffs snuck in (pure CSS/theme plan),
  and the light palette actually activates via OS preference, not a hardcoded mode.

## Amendment — 2026-07-08 — editor layout issues found during plan 004 smoke

Two editor-layout problems surfaced while smoke-testing plan 004 (routed here
because they are layout/chrome, which this plan owns — do NOT fix them in 004):

1. **Long lines scroll horizontally; content clips at the left edge even
   maximized.** Enable soft wrapping so lines wrap like Obsidian: add
   `EditorView.lineWrapping` to the editor extensions (in `src/editor.ts` or the
   editor-theme extension bundle). Also give the editor a proper full-height flex
   context so it fills the window and the readable column centers correctly:
   `#app` a `display:flex; flex-direction:column; height:100vh`; the editor
   container `flex:1; min-height:0`; the inline-title row `flex:0 0 auto`. The
   readable column (`.cm-content { max-width; margin:auto }`) this plan already
   specifies then lands cleanly.
2. **Clicks land ~one line off (must click between lines to hit the intended
   line).** Almost certainly a line-height mismatch introduced by the heading
   font-scale marks (`.uv-h1..h6 { font-size }`) applied to inline spans without
   a matching line box. When this plan sets the real type scale, set an explicit
   consistent `line-height` on `.cm-line` and on the heading classes so
   CodeMirror's vertical measurement matches the rendered box; verify by clicking
   directly on several lines (including heading lines) and confirming the caret
   lands where clicked. If it persists after line-height is normalized, report
   the DOM/measurement details — do not paper over it with offsets.

## Correction round 1 — 2026-07-09 — click-accuracy still off (root cause found)

Theme applied and looks right; `**bold**` hotfix confirmed. Remaining issue:
clicking to place the caret lands ~one line high on many lines (cumulative
drift). Reviewer read `theme.css` — root cause is concrete:

**The heading rules use `display: inline-block` on inline decoration spans.**
`.uv-h1..h6` (theme.css) set `font-size: 1.6em … 0.9em` AND `display:
inline-block` AND `line-height: 1.6`. These are `Decoration.mark` (inline) spans
inside `.cm-line`. `display: inline-block` creates a new formatting context that
changes the line-box height CodeMirror measures, so `posAtCoords` (click→pos)
mis-maps; the taller heading lines then shift everything below them, which is why
many lines — not just headings — are off. The unitless `line-height: 1.6` on a
1.6em span compounds it (effective 1.6×1.6em ≠ the `.cm-line` line box).

**Fix — Step A (CSS only, this plan's scope; try first):**
- Remove `display: inline-block` and `margin: 0` from every `.uv-h1..h6` rule —
  keep only `font-size`, `font-weight`, and (for h6) color. Let them render as
  normal inline marks so the line grows naturally and CM measures it.
- Remove `display: inline-block` from `.uv-blockquote` too (same hazard).
- Keep `.cm-line { line-height: 1.6 }`. Do NOT put a unitless `line-height` on
  the heading spans; if a heading needs vertical breathing room, use the line,
  not the inline span.
- Verify: click directly on normal lines, heading lines, and lines just below a
  block widget (Properties/callout/table) — caret must land exactly where
  clicked. Report the result.

**Fix — Step B (only if Step A doesn't fully fix heading-line clicks;
authorized `003-hotfix:` on this branch — one `src/preview/widgets/inline.ts`
change, mirrors the bold hotfix precedent):**
- Convert the heading styling from an inline `Decoration.mark` to a
  `Decoration.line` that adds the `uv-h{level}` class to the whole `.cm-line`
  (keep the separate `HeaderMark`-hiding replace decoration as-is). Move the
  heading `font-size` CSS onto `.cm-line.uv-h1 … .cm-line.uv-h6`. A line
  decoration grows the entire line box uniformly, which is how CodeMirror
  measures heights correctly — the robust Obsidian-like approach. Add/adjust the
  inline heading test if the decoration kind changes (it will now be a line deco,
  not a mark on the node span).

Gates unchanged (`npm run typecheck && npm test && npm run build`). If Step B is
used, note the extra `inline.ts` diff in the plan-005 report (as with the bold
`003-hotfix`). Do NOT introduce click-coordinate offsets or transforms as a
workaround — fix the measurement.

## Correction round 2 — 2026-07-09 — remove redundant `// @ts-nocheck`

Reviewer spotted in commit `806648f`: `tests/theme/tokens.test.ts` starts with
`// @ts-nocheck`, which disables ALL type checking for that file (hiding any
future type errors, not just the original one). The same commit already added
the correct fix — `@types/node` as a devDependency — which types the `fs`/`path`
imports that were the actual problem. So the `// @ts-nocheck` is now redundant
and only removes safety.

**Fix (one commit `005: remove redundant @ts-nocheck from tokens test`):**
delete the `// @ts-nocheck` line from `tests/theme/tokens.test.ts` and confirm
`npm run typecheck` still passes (it should, now that `@types/node` is present).
If a real type error surfaces after removal, fix it properly (type the value) —
do not re-add the blanket suppression.
