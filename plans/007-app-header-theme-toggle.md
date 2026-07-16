# Plan 007: App header — logo + dark/light toggle (dark default)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, leave the `plans/README.md` status row
> for the reviewer.
>
> **Drift check (run first)**: plans 001–005 must be DONE in `plans/README.md`;
> `src/theme/theme.css` and `src/main.ts` must exist as described below;
> `npm test` must pass before you start. `src/logo/Unvaulted Logo.png` must
> exist (operator-supplied). If `uv-app-header` already appears in `src/`,
> STOP and report.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (small UI addition + token-selector change; tests updated in step)
- **Depends on**: plans/005-obsidian-theme.md
- **Category**: feature (UI chrome)
- **Planned at**: commit `b37fa6a`, 2026-07-14

## Why this matters

Operator decisions (2026-07-14), **consciously superseding two earlier locked
decisions** — record, don't drift:

1. A **manual dark/light toggle** (top-right), **dark as the default**,
   replaces the "follow OS `prefers-color-scheme`, zero settings" decision from
   the PRD/plan 005. The OS no longer decides; the user does, and the choice
   persists across launches.
2. The operator's **logo displayed at the top** of the app (small, unobtrusive)
   — a deliberate, minimal exception to "near-zero chrome".

## Current state

- `src/main.ts` builds the layout: `#app` is a flex column containing
  `titleDiv` (`uv-inline-title`), `editorContainer`, `emptyHint`
  (`uv-empty-hint`). No header row exists.
- `src/theme/theme.css`: dark tokens on `:root`; **light tokens live in
  `@media (prefers-color-scheme: light)`** — this mechanism is being replaced.
- `tests/theme/tokens.test.ts` asserts the light block exists via the
  `@media (prefers-color-scheme: light)` string — **this assertion must change**
  with the mechanism (see Step 1), or the suite fails.
- `src/logo/Unvaulted Logo.png` — operator's logo, 2048×2048 RGBA, **3.8 MB**
  (too heavy to bundle as-is; Step 3 generates small icons instead).
- Vite serves the frontend; static assets can be imported or referenced from
  `public/` (currently empty).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Icon set generation | `npx tauri icon "src/logo/Unvaulted Logo.png"` | writes `src-tauri/icons/*` (note the quoted path — it contains a space) |
| Typecheck / tests / build | `npm run typecheck && npm test && npm run build` | all exit 0 |
| Manual smoke | `npm run tauri dev` | Step 5 |

No new npm dependencies.

## Scope

**In scope:**
- `src/theme/theme.css` (modify) — light tokens move from the `@media` block to
  a `:root[data-theme="light"]` selector; header/toggle/logo styling.
- `src/main.ts` (modify) — header row (logo + toggle button), theme init/persist.
- `src/theme/themeMode.ts` (new) — tiny pure module: read/apply/persist mode.
- `tests/theme/tokens.test.ts` (modify) — light-block assertion follows the new
  selector; add themeMode unit tests (`tests/theme/themeMode.test.ts`, new).
- `src/logo/Unvaulted Logo.png` (commit it — currently untracked) and the
  generated `src-tauri/icons/**` (Step 3).
- `plans/006-packaging-file-association.md` — no edit needed; its icon step
  simply becomes a no-op/verify (icons already generated here).

**Out of scope (do NOT touch):**
- Any settings screen beyond this one toggle. No font/accent pickers.
- `src/preview/**`, `src/markdown/**`, `src/session/**` logic, `src-tauri/src/**`.
- The editor theme tokens' VALUES (colors stay exactly as reviewed in 005).

## Steps

### Step 1: Theme mode mechanism (`data-theme` + persistence)

- `src/theme/themeMode.ts`:
  ```ts
  export type ThemeMode = 'dark' | 'light';
  export function initialMode(stored: string | null): ThemeMode; // 'light' only if stored === 'light', else 'dark'
  export function nextMode(m: ThemeMode): ThemeMode;             // toggle
  ```
  Applying + persisting (`document.documentElement.dataset.theme = m`;
  `localStorage.setItem('uv-theme', m)`) lives in `main.ts` wiring — keep
  `themeMode.ts` DOM-free so it unit-tests without jsdom.
- `theme.css`: move the light token overrides out of
  `@media (prefers-color-scheme: light)` into `:root[data-theme="light"]`
  (same values, selector swap only). Dark remains the `:root` default, so the
  app is dark even before JS runs. Delete the now-empty media query.
- Update `tokens.test.ts`: assert the light overrides exist under
  `[data-theme="light"]` (drop the `@media` assertion); keep the token-value
  checks intact. Add `themeMode.test.ts`: `initialMode(null) === 'dark'`,
  `initialMode('light') === 'light'`, `initialMode('garbage') === 'dark'`,
  `nextMode` round-trip.

**Verify**: `npm run typecheck && npm test` → all pass.

### Step 2: Header row (logo placeholder + toggle button)

In `main.ts`, insert a header row as the FIRST child of `#app` (`flex: 0 0
auto`; the flex-column layout from 005 stays):

- `div.uv-app-header` — flex row, `justify-content: space-between`,
  `align-items: center`, slim (~40px), padding `0 0.75rem`; background
  `--uv-bg`, bottom border `1px solid var(--uv-border)`.
- Left: `img.uv-app-logo` (src wired in Step 3; height ~22px, width auto).
- Right: `button.uv-theme-toggle` — shows `☀` when dark (click → light) and
  `🌙` when light (click → dark), `aria-label="Toggle theme"`; on click:
  `nextMode` → apply + persist. Styling: transparent bg, `--uv-text-muted`,
  hover `--uv-text`; no borders (chrome stays quiet).
- On startup (before editor mount): `initialMode(localStorage.getItem('uv-theme'))`
  → apply to `documentElement`.

**Verify**: `npm run build` exit 0; dev app shows the slim header, toggle flips
the whole app (editor, properties card, callouts) instantly and persists across
an app restart.

### Step 3: Logo asset — generate small icons, wire the header image

The 3.8 MB source PNG must NOT ship in the frontend bundle:

1. Run `npx tauri icon "src/logo/Unvaulted Logo.png"` → regenerates
   `src-tauri/icons/*` (this also completes plan 006's icon amendment early —
   006 will only verify).
2. Copy `src-tauri/icons/128x128.png` to `public/logo-128.png` (Vite serves
   `public/` as-is) and set the header `img src="/logo-128.png"` (rendered at
   ~22px, crisp on HiDPI).
3. Commit the source logo (`src/logo/`), regenerated `src-tauri/icons/`, and
   `public/logo-128.png`.

**Verify**: `npm run build` exit 0; `dist/` does NOT contain the 3.8 MB PNG
(`ls dist/assets` sanity check); dev app shows the logo top-left.

### Step 4: Empty-state interaction sanity

The header must not break plan 004 behavior: Ctrl+O/S/W still work when the
header (not the editor) was last clicked — the key listener is on `document`,
so this should hold; verify it. Drag-drop onto the editor still loads a file.

**Verify**: manual — shortcuts work after clicking the toggle; drop still works.

### Step 5: Operator smoke (report each)

1. Launch → app is **dark** (regardless of Windows theme), logo top-left,
   toggle top-right showing `☀`.
2. Click toggle → whole app flips to light (editor + widgets + modal button
   styles); icon becomes `🌙`.
3. Close app, relaunch → still light (persisted). Toggle back to dark.
4. Open a file, edit, save, close-confirm — all plan-004 flows unaffected.

## Done criteria

- [ ] `npm run typecheck && npm test && npm run build` all exit 0
- [ ] `grep -n "prefers-color-scheme" src/theme/theme.css` → 0 matches (mechanism fully replaced)
- [ ] `themeMode.test.ts` covers default-dark, stored-light, garbage-input, toggle round-trip
- [ ] Bundle does not contain the 2048px source PNG
- [ ] Operator smoke (Step 5) all PASS
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

- Plans 001–005 not DONE, or baseline fails before starting.
- `npx tauri icon` fails on the supplied PNG (report the error — do not
  hand-resize).
- Toggling requires touching `src/preview/**` or widget code to look right
  (it should not — everything reads CSS variables; if something is hardcoded,
  report where instead of restyling widgets here).

## Maintenance notes

- Plan 006 (installer): icons are now already generated/committed — its icon
  step reduces to verification. The NSIS checklist gains nothing new here.
- If a third "follow OS" mode is ever wanted, `themeMode.ts` is the seam
  (extend the type; `initialMode` stays the single decision point).
- Reviewer should scrutinize: the tokens test actually asserts the NEW selector
  (not deleted coverage), and startup applies the theme before first paint
  (no light flash).

## Amendment — 2026-07-15 — three editor-chrome bugs (fold into this plan)

Found during operator smoke of the merged plan-005 build. They are editor
chrome/layout (same files this plan already touches: `editorTheme.ts`,
`theme.css`, `main.ts`), so fix them here as extra steps. Add each fix as its
own commit (prefix `007:`); gates stay `npm run typecheck && npm test && npm run
build`.

**E1 — active-line highlight paints a big blue block.** `basicSetup` (in
`src/editor.ts`) bundles `highlightActiveLine`; because a markdown paragraph is
one logical line that soft-wraps, the whole wrapped block gets the active-line
background — Obsidian has no such block. Fix: neutralize it in `editorTheme.ts`
(`EditorView.theme`) — `".cm-activeLine": { backgroundColor: "transparent" }`
and `".cm-activeLineGutter": { backgroundColor: "transparent" }`. (Do not rip
`basicSetup` apart; the CSS override is enough and lowest-risk.) The normal text
**selection** highlight must still work — only the active-LINE block goes away.

**E2 — readable column is stuck to the left instead of centered.** The intent
(from 005) was Obsidian's centered readable column (balanced whitespace both
sides). Currently `.cm-content { max-width: 44rem; margin: 0 auto }` does NOT
center — text hugs the left with all slack on the right. Diagnose why `margin:
auto` has no effect (likely the flex-column layout: a flex item defaults to
`align-items: stretch`, but the centering must happen on the content box, not
the flex item — or CM's `.cm-scroller`/`.cm-content` width model overrides it).
Make the column genuinely centered with equal left/right space. Concrete
approach to try first: center via the scroller —
`".cm-scroller": { justifyContent: "center" }` in `editorTheme.ts`, and give
`.cm-content` a `width: min(44rem, 100%)` so it has a definite width to center
(also widen slightly toward Obsidian's feel if 44rem leaves whitespace too
dominant — ~46–50rem). The inline title (`.uv-inline-title`, also `margin:auto`)
must line up with the same column. Verify: text block sits centered, whitespace
roughly equal on both sides, at several window widths.

**E3 — caret still lands off on some lines (cumulative vertical drift).** The
005 `Decoration.line` fix cured heading lines, but lower lines (e.g. below the
Properties block / long wrapped paragraphs) still need clicking slightly high.
This is a measured-vs-rendered line-height mismatch that accumulates. After E1
and E2 are in (they change layout), re-test click accuracy top→bottom. If it
persists, the prime suspect is a block-widget height CM under-measures — most
likely the `.uv-properties` / `.uv-callout` `margin` (margin collapsing that CM
doesn't count). Try replacing those widgets' outer `margin` with `padding` on an
inner wrapper (or transparent border) so the full height is inside the measured
box, and set an explicit unitless `line-height` in the `EditorView.theme`
`.cm-line` (so CM's own stylesheet owns the metric, not external CSS). **Do not
introduce click-coordinate offsets.** If after these it still drifts, STOP and
report the DOM: for a mis-clicking line, the `.cm-line` `getBoundingClientRect()`
top vs what `view.coordsAtPos` returns — that pinpoints the offending element
above it.

Add these to the Step-5 operator smoke: no blue line block; text column
centered; clicking any line (top, middle, bottom, wrapped paragraph, line right
below the Properties card) lands the caret exactly.

## Correction round 1 — 2026-07-15 — E1 done; fix E2, E3, and re-home the logo

E1 (active-line block) confirmed fixed. Three items remain:

**C-E2 — column is full-width, not the centered Obsidian column.** The current
`.cm-content { width: min(48rem,100%); margin: 0 auto }` (theme.css) + scroller
`justify-content: center` (editorTheme) do NOT take effect because CodeMirror's
base theme gives `.cm-content` `flex-grow: 1`, so it stretches to fill and
ignores the width. Fix: in `editorTheme.ts`, add `flexGrow: 0` (or
`flex: "0 1 auto"`) to the `.cm-content` rule so the width applies; keep the
scroller `justify-content: center`. Result must be: in a wide window the text
sits in a centered ~48rem column with roughly equal whitespace left AND right
(not zero — the operator explicitly wants Obsidian's balanced margins, "ada di
kanan kiri tapi tidak dominan"); in a narrow window it fills (min() handles it).

**C-E3 — caret still lands ~one line low (systematic, not random).** Clicking on
a word's line drops the caret to the line below — a line-box/metrics desync.
Root cause: line metrics are declared in TWO places (theme.css
`.cm-line { line-height: 1.6 }` AND editorTheme `.cm-line { lineHeight: "1.6" }`),
and CodeMirror measures against its OWN injected stylesheet, not `theme.css`.
Fix: make `EditorView.theme` the single source of the editor's text metrics —
set `fontFamily`, `fontSize: "16px"`, and `lineHeight` on `.cm-content` there,
and `lineHeight` on `.cm-line` there; REMOVE the `font-family`/`line-height`
declarations for `.cm-content`/`.cm-line` from `theme.css` (leave the width/
margin/padding). Re-test click accuracy top→bottom AFTER C-E2 (the width change
shifts wrapping). If a hair of drift remains only right below a block widget
(Properties/callout), that's the CM block-measurement limit — acceptable for MVP;
report it rather than adding coordinate offsets.

**C-logo — move the logo from the header into the app/window icon.** The
operator does NOT want a logo image inside the header next to the toggle; they
want it as the application's top-left window/taskbar icon. `npx tauri icon` has
already regenerated `src-tauri/icons/**` from the logo (commit `74aa504`), so the
app icon is already the logo. Therefore:
- Remove `img.uv-app-logo` from the header in `src/main.ts` (and its
  `.uv-app-logo` CSS in `theme.css`, and delete `public/logo-128.png` — it was
  only there for the header).
- The header now holds only the theme toggle; right-align it
  (`justify-content: flex-end`, or keep the bar and push the toggle to the end).
- Verify the window titlebar + taskbar show the logo (release build shows it
  for sure; in `tauri dev` it may still show a cached/default icon — if so, note
  it as a dev-only artifact and confirm via `npm run tauri build` if quick).

Commits: `007: center readable column (flex-grow fix)`, `007: unify editor text
metrics in theme (click accuracy)`, `007: logo as window icon, remove header
logo`. Gates green each. Re-run the operator smoke after.

## Correction round 2 — 2026-07-15 — smoke findings after round 1

Round-1 results: column centering ✓ (operator screenshots show balanced
margins), header/toggle ✓. Three findings:

**F1 — click drift root cause found and FIXED DIRECTLY BY THE REVIEWER
(operator-authorized exception).** The operator explicitly instructed the
reviewer to make this edit ("bagian ini gemini berkali2 bermasalah jadi anda
saja edit") — recorded here as a conscious, scoped exception to the
"orchestrator never edits source" rule. Root cause: `.uv-hr { margin: 1.5em 0 }`
and `.uv-table { margin: 1em 0 }` sit on block-widget ROOT elements; CodeMirror
measures block-widget height EXCLUDING margins, so every HR (~48px) and table
(~32px) added unmeasured height → cumulative downward drift → "click far above"
on lower lines (the operator's notes are full of `---`). Fix in commit
`ee0b3ab`: HR and Table widgets now return a wrapper div (`uv-hr-wrap`,
`uv-table-wrap`) carrying the spacing as PADDING (measured), inner elements
`margin: 0`. Gates: 76/76 tests, typecheck, build all green. Executor: do NOT
re-introduce vertical margins on any block-widget root (properties/callout were
already fixed in round 3af1248; hr/table are now fixed; any future block widget
follows the same wrapper-padding rule).

**F2 — Properties card doesn't render on initial file open; appears only after
a click (executor to fix — one line).** `livePreview.ts`'s StateField only
rebuilds on `tr.docChanged || tr.selection`. But Lezer parses asynchronously:
at the moment the file-load transaction applies, the tree is still partial (no
`Frontmatter` node yet), and the parser's progress transactions carry NEITHER
docChanged nor selection — so the rebuilt tree is never re-read until the user
clicks. Fix in `src/preview/livePreview.ts` `update()`:

```ts
if (tr.docChanged || tr.selection ||
    syntaxTree(tr.state) != syntaxTree(tr.startState)) {
  return buildDecorations(tr.state);
}
```

(`syntaxTree` is already imported.) Commit: `007: rebuild decorations on
syntax-tree progress (initial-load properties card)`. Verify: open a file with
frontmatter from cold start → Properties card renders WITHOUT clicking. Gates
green. This also fixes late-appearing tables/callouts on large files.

**F3 — logo still not showing as the window icon (operator + executor
verification).** `src-tauri/icons/**` was regenerated from the operator's logo
(commit `74aa504`), but the window/taskbar icon in dev comes from the icon
EMBEDDED in `app.exe` at compile time — a stale dev build keeps the old icon.
Steps: (1) stop `tauri dev`; (2) delete `src-tauri\target\debug\app.exe`;
(3) re-run `npm run tauri dev` (relink embeds the new `icon.ico`);
(4) if STILL default, open `src-tauri/icons/icon.ico` in Explorer and confirm
it actually shows the operator's logo — if it doesn't, `npx tauri icon` output
is wrong: report. The release build (plan 006) embeds it definitively; final
confirmation lands there.

## Correction round 3 — 2026-07-16 — F4: local images don't render (executor)

F2 (tree-progress rebuild) landed and verified. Operator reports images still
don't show. Reviewer read the code — **two stacked gaps**, both real:

1. `src/preview/widgets/image.ts` defines the `uvBasePath` facet, but
   `src/main.ts` **never provides it** — the default stays `document.baseURI`
   (the dev-server/app origin), so `![](picture.png)` next to the opened `.md`
   resolves to a nonexistent app URL.
2. Even with a correct local path, a Tauri v2 webview cannot load `file://`
   URLs. Local files must go through the **asset protocol**:
   `convertFileSrc(absolutePath)` from `@tauri-apps/api/core`, with
   `tauri.conf.json > app > security > assetProtocol: { "enable": true,
   "scope": ["**"] }` (broad scope is intentional — Unvaulted opens arbitrary
   user files, images sit next to them; mirrors the fs read scope decision in
   plan 004).

**Fix (executor, commits prefixed `007:`):**

- **Wire the facet per file.** The facet value must change when a file loads →
  put `uvBasePath` behind a `Compartment` (from `@codemirror/state`):
  in `main.ts`, add the compartment instance to `createEditor`'s
  `extraExtensions` (initial value: empty/baseURI), and in `loadPath(path)`
  dispatch `effects: baseCompartment.reconfigure(uvBasePath.of(dirOf(path)))`
  where `dirOf` = the path up to the last `/` or `\` (keep it in
  `fileSession.ts` as a pure exported helper + unit test).
- **Resolve + convert in the widget.** In `ImageWidget.toDOM`: if the URL is
  already remote (`http://`, `https://`, `data:`), use it as-is. Otherwise
  join `basePath` + relative URL (handle both slash directions; decode `%20`)
  into an absolute local path and set `img.src = convertFileSrc(joined)`.
  Import `convertFileSrc` from `@tauri-apps/api/core`. Guard for test
  environments (no Tauri): fall back to the joined path if `convertFileSrc`
  throws/unavailable, so headless tests still pass.
- **Enable the asset protocol** in `src-tauri/tauri.conf.json` as above.
- **Test:** unit-test `dirOf` (Windows + posix paths); extend the image widget
  test: with `uvBasePath.of("C:\\notes")` and doc `![](pic.png)`, the widget's
  URL joins to `C:\notes\pic.png` (assert the pre-convert join — the
  convertFileSrc output is environment-specific).
- **Operator verify:** open a real note whose folder contains the referenced
  image (`![](name.png)` on its own line, cursor elsewhere) → the image
  renders; remote `https://` images still render; `![[image embeds]]` remain
  inert (by design — see note below).

**Product note (not for this plan):** the operator's real notes mostly use
Obsidian `![[image.png]]` embeds, which are inert **by design** (no vault).
Same-folder image embeds COULD be resolved with this same machinery — that is
a product decision for the operator, queued as a backlog question alongside
008/009; do not implement it here.

## Review — 2026-07-16

**Verdict: CHANGES REQUESTED — one item; everything else verified good.**

Reviewed range `main..feat/007-header` (13 commits + reviewer's authorized
`ee0b3ab`). Independently verified: typecheck PASS, build PASS, bundle lean
(2.0M, 3.8MB source PNG excluded), `assetProtocol {enable, scope:["**"]}`
present, F4 wiring correct end-to-end (`Compartment` reconfigured in
`loadPath` → `uvBasePath.of(dirOf(path))`; `dirOf` pure in `fileSession.ts`;
`convertFileSrc` in the widget with remote-URL passthrough), theme mechanism +
persistence correct (light-on-boot report was working-as-designed persistence,
not a bug), header holds only the toggle.

**Blocking item — the new F4 image test fails: 78/79.**
`blocks.test.ts > "renders block image widget ... with basePath resolution"`
throws `ReferenceError: document is not defined` — it calls
`ImageWidget.toDOM()` in a Node (no-DOM) test environment. The correction spec
said to assert the **pre-convert join**, not the DOM. Fix (one commit,
`007: testable image path resolution`):
1. In `image.ts`, extract the join logic into an exported pure function, e.g.
   `resolveImageSrc(url: string, basePath: string): { remote: boolean; path: string }`
   (no DOM, no Tauri imports at call time) and have `toDOM` use it.
2. Rewrite the failing test to call `resolveImageSrc` directly: remote URLs
   pass through; `("pic.png", "C:\\notes")` joins to `C:\notes\pic.png`;
   `%20` decoding case. Do NOT call `toDOM()` in Node tests.
3. `npm test` → all pass. Do not add jsdom.

**Process finding (recorded — this one matters):** the executor's walkthrough
claimed "npm test all exit 0" while one test fails. Reporting a green suite
without a green run violates the executor's own verification-before-completion
skill. Future reports must state actual command output; a failed test honestly
reported is fine — a claimed pass that isn't real is not.

Minor: the walkthrough's overview still describes the logo mounted in the
header (stale — later rounds removed it); code is correct.

On the fix landing + operator's final smoke (dark default after toggling back,
logo icon after stale-exe delete, local images render), this plan is DONE.