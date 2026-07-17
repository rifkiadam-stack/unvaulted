# Plan 008: Images — render Obsidian `![[image]]` embeds + clipboard paste

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. **Run `git status` before your completion report
> and include its output** — three prior plans shipped from uncommitted state;
> the tree must be clean. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plans 001–007 must be DONE in `plans/README.md`.
> `src/preview/widgets/image.ts` must export `resolveImageSrc` and `uvBasePath`;
> `src-tauri/src/lib.rs` must contain commands `get_open_path`, `read_file`,
> `save_atomic`. `npm test` must pass (79 tests at plan time). If
> `src/preview/embedResolver.ts` already exists, STOP and report.

## Status

- **Priority**: P2 (first post-MVP feature — the operator's most-requested)
- **Effort**: M
- **Risk**: MED (async resolution meets sync decorations; new IPC surface)
- **Depends on**: plans/007-app-header-theme-toggle.md (asset-protocol machinery)
- **Category**: feature
- **Planned at**: commit `28f0099`, 2026-07-17

## Why this matters

The operator's real Obsidian notes embed images as `![[Screenshot ....png]]`.
Unvaulted currently renders those as inert pills (a deliberate MVP decision —
no vault, nothing to resolve against), so real notes look broken next to
Obsidian. This plan consciously **reverses that decision for IMAGE embeds
only**: resolve the file with a bounded filesystem search and render it via the
existing asset-protocol image machinery. Non-image embeds (`![[Some note]]`)
stay inert — no vault semantics are being introduced.

Second half: **paste an image from the clipboard** (screenshot workflow).
Obsidian saves the pasted image into the vault and inserts an embed; Unvaulted
saves it NEXT TO the open `.md` and inserts standard `![](...)` syntax, which
already renders (plan 007 F4).

## Current state (verified excerpts)

- `src/preview/widgets/links.ts:83-90` — the `Embed` node renders
  `InertLinkWidget(text, "Embed")` unconditionally when not revealed. The
  embed's inner text is extracted with
  `state.doc.sliceString(node.from + 3, node.to - 2)` (strips `![[` and `]]`).
- `src/preview/widgets/image.ts` — exports `uvBasePath` facet (provided per
  file via a `Compartment` in `main.ts`, value = `dirOf(path)`) and
  `resolveImageSrc(url, basePath)`; `ImageWidget.toDOM` uses
  `convertFileSrc` for local paths. Asset protocol is enabled
  (`tauri.conf.json > app.security.assetProtocol { enable, scope: ["**"] }`,
  Cargo feature `protocol-asset`).
- `src/preview/livePreview.ts` — `StateField` rebuilds decorations on
  `tr.docChanged || tr.selection || syntaxTree(tr.state) != syntaxTree(tr.startState)`.
- `src-tauri/src/lib.rs` — commands `get_open_path`, `read_file`,
  `save_atomic` (temp+rename pattern); handler list at the bottom.
- `src/session/platform.ts:2` — **orphan import** `readTextFile` from
  `@tauri-apps/plugin-fs` (flagged in the 006 review): remove it in this plan's
  Step 1 while touching the file.
- `src/session/fileSession.ts` — exports pure `dirOf(path)`.
- `src/main.ts` — owns the platform wiring, `loadPath`, the `baseCompartment`,
  and global keyboard listeners. No paste handling exists yet.
- Obsidian context (why the search is bounded UPWARD): Obsidian's default
  "attachment folder" is the VAULT ROOT — the operator's screenshots live
  several directories ABOVE the note. Same-folder-only resolution is not enough.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Gates | `npm run typecheck && npm test && npm run build` | all exit 0 |
| Rust | `cargo check` (in `src-tauri/`) | exit 0 |
| Rust dep (Step 3 only) | `cargo add base64` (in `src-tauri/`) | adds base64 crate |
| Manual smoke | `npm run tauri dev` | Step 5 |

No new **npm** dependencies. One new **Rust** crate is explicitly authorized:
`base64` (for the paste payload). Nothing else.

## Scope

**In scope:**
- `src-tauri/src/lib.rs` — two new commands: `resolve_embed`, `save_binary`.
- `src/preview/embedResolver.ts` (new) — cache + request/dispatch glue.
- `src/preview/widgets/links.ts` — Embed branch: image-embed path.
- `src/preview/livePreview.ts` — rebuild on the resolution effect.
- `src/main.ts` — paste listener; wire the resolver's dispatch.
- `src/session/platform.ts` — `saveBinary`, `resolveEmbed` methods; REMOVE the
  orphan `readTextFile` import.
- `src/session/fileSession.ts` — pure helpers `pastedImageName(now: Date)`,
  `imageMarkdownFor(name)`.
- `src/theme/theme.css` — only if a class for embedded images is added
  (`uv-embed-image`), structural.
- Tests: `tests/preview/embeds.test.ts` (new), `tests/session/fileSession.test.ts`
  (extend), `tests/preview/links.test.ts` (keep green).

**Out of scope (do NOT touch):**
- Non-image embeds (`![[note]]`, `![[note#heading]]`) — stay inert pills.
- Wikilink navigation of any kind; vault indexing; watching the filesystem.
- Obsidian-style attachment-location settings (no settings UI exists).
- `src/markdown/**` (parser already emits `Embed` nodes — consume only).

## Design (how it fits the sync-decoration constraint)

Decorations build synchronously; file existence is async IPC. Bridge pattern:

1. **Rust does the whole search in one call.**
   `resolve_embed(base_dir: String, file_name: String) -> Option<String>`:
   starting at `base_dir`, then walking up at most **5** parent directories,
   check at each level: `<dir>/<file_name>` and `<dir>/attachments/<file_name>`.
   Return the first path that exists (absolute, as String); else `None`.
   Reject `file_name` containing `/`, `\` or `..` (return None) — the target is
   a bare filename, and this guard keeps the search from being abused as a
   path-traversal probe.
2. **JS module `embedResolver.ts`** holds a module-level
   `Map<string, string | null>` cache (`key = baseDir + "|" + fileName`), a
   pending `Set`, an injectable resolver fn (default:
   `invoke('resolve_embed', ...)`; tests inject a stub via
   `setEmbedResolverForTests`), and a dispatch hook `setEmbedDispatch(fn)`
   called from `main.ts` after the editor is created. A `StateEffect<null>`
   (`embedResolutionArrived`) exists solely to trigger a decoration rebuild
   when an answer lands (the cache itself is module state — decorations read
   it directly on rebuild).
3. **`links.ts` Embed branch**: extract the target text; if it has an image
   extension (`png|jpe?g|gif|webp|svg|bmp`, case-insensitive) AND
   `state.facet(uvBasePath)` is a non-empty local dir:
   - cache hit with a path → render an image block widget for that absolute
     path (reuse the existing `ImageWidget` from `image.ts` — export it if it
     isn't — with the resolved absolute path; class `uv-embed-image` may wrap
     styling). Reveal behavior unchanged (selection on the line shows raw
     `![[...]]`).
   - cache hit with `null` (searched, not found) → inert pill as today.
   - cache miss → inert pill now + `queueResolve(key, baseDir, fileName)`
     (fire-and-forget; on answer, write cache and dispatch the effect).
   Non-image targets → inert pill, never queued.
4. **`livePreview.ts`**: add `|| tr.effects.some(e => e.is(embedResolutionArrived))`
   to the rebuild condition.
5. **Paste** (`main.ts`): a `document` 'paste' listener. If
   `clipboardData.items` contains an `image/*` item: `preventDefault()`. If no
   file is open (`session.path === null`) → `platform` shows a simple native
   message ("Save the note first to paste images" — `message()` from
   `@tauri-apps/plugin-dialog`, add a thin `Platform.showMessage`). Otherwise:
   blob → `arrayBuffer` → base64 (chunked `btoa`) →
   `invoke('save_binary', { path: dirOf(session.path) + sep + name, contentsBase64 })`
   with `name = pastedImageName(new Date())` →
   `view.dispatch` inserting `imageMarkdownFor(name)` at the main cursor.
   - `pastedImageName(now)` → `Pasted image YYYYMMDD-HHMMSS.png`.
   - `imageMarkdownFor(name)` → `![](<name with spaces %20-encoded>)` — the
     existing URL parser stops at raw spaces; `resolveImageSrc` already decodes
     `%20`.
   - `save_binary(path, contents_base64)` in Rust: decode with the `base64`
     crate, write via the same temp+rename pattern as `save_atomic`; reject a
     path whose parent doesn't exist.

## Steps (one commit per step, prefix `008:`)

### Step 0: Regenerate icons from the updated logo

The operator revised the logo AFTER plan 006 shipped: `src/logo/black logo.png`
at commit `c1604a3` is a NEW image (1254×1254 **RGB — no alpha channel**; the
operator accepted that icons will have a solid background). Run
`npx tauri icon "src/logo/black logo.png"`, commit the regenerated
`src-tauri/icons/**` (`008: regenerate icons from revised logo`), and delete
the stale dev exe (`src-tauri\target\debug\Unvaulted.exe` — note the binary is
named Unvaulted.exe since plan 006) so the next dev run embeds it.

**Verify**: `git status` clean after the commit; icons diff shows changed sizes.

### Step 1: Rust commands + platform wiring + orphan-import cleanup

`resolve_embed` and `save_binary` in `lib.rs` (registered in
`generate_handler!`); `cargo add base64`; `platform.ts`: add
`resolveEmbed(baseDir, fileName): Promise<string | null>`,
`saveBinary(path, contentsBase64): Promise<void>`,
`showMessage(text): Promise<void>`; delete the orphan `readTextFile` import.

**Verify**: `cargo check` exit 0; `npm run typecheck` exit 0.

### Step 2: `embedResolver.ts` + image-embed rendering + rebuild-on-effect

Per the design. Headless tests (`tests/preview/embeds.test.ts`) with an
injected stub resolver:
- `![[pic.png]]`, cache seeded with a path → decorations contain an image
  widget for the embed (assert widget constructor / spec), NOT the inert pill.
- cache seeded `null` → inert pill.
- cache miss → inert pill AND the stub resolver was called once with
  `(baseDir, "pic.png")`; a second rebuild does not re-call it (pending/cached).
- `![[Some Note]]` (no image extension) → inert pill, resolver NEVER called.
- no basePath (untitled buffer) → inert pill, resolver never called.

**Verify**: `npm test` all pass.

### Step 3: Paste helpers + listener

`pastedImageName` / `imageMarkdownFor` in `fileSession.ts` with unit tests
(fixed `Date` → exact name; name with spaces → `%20` encoding; round-trip
through `resolveImageSrc` decodes back). Paste listener + save-first message in
`main.ts` per the design.

**Verify**: `npm test` all pass; `npm run typecheck && npm run build` exit 0.

### Step 4: Gates + tree hygiene

Full gates + `cargo check`; `git status` must be clean after commits.

### Step 5: Operator smoke (report each)

1. Open a real wiki note whose `![[Screenshot ....png]]` files live at the
   vault root (several folders up) → the screenshots RENDER in place.
2. An embed whose file genuinely doesn't exist → stays an inert pill (no error
   spam in console).
3. `![[Some Note]]` (non-image) → inert pill as before.
4. With a saved note open: screenshot something (Win+Shift+S), Ctrl+V in
   Unvaulted → a `Pasted image ....png` file appears NEXT TO the `.md`, the
   markdown line is inserted, and the image renders immediately. The file
   remains after deleting the clipboard source (it is a real copy on disk).
5. In an unsaved/untitled buffer: Ctrl+V an image → friendly "save first"
   message, nothing inserted, no crash.
6. Reveal behavior: cursor on an embed line shows raw `![[...]]`; elsewhere
   shows the image.

## Done criteria

- [ ] `npm run typecheck`, `npm test`, `npm run build`, `cargo check` all exit 0
- [ ] Embed tests cover: resolved→image, not-found→pill, miss→queued-once,
      non-image→never queued, no-basePath→never queued
- [ ] Paste helper tests cover name format + `%20` round-trip
- [ ] `grep -n "readTextFile" src/session/platform.ts` → 0 matches (orphan gone)
- [ ] `grep -rn "fetch(\|XMLHttpRequest" src/preview/` → 0 matches (still no
      network in preview)
- [ ] Operator smoke items 1–6 all confirmed
- [ ] `git status` clean at completion report (output included in the report)

## STOP conditions

- Plans 001–007 not DONE, or the drift-check exports/commands are missing.
- Any npm dependency beyond the authorized `base64` Rust crate seems needed.
- The paste `ClipboardEvent` in the Tauri webview does not expose image items
  (platform limitation) — report what `clipboardData.items` actually contains
  instead of switching to a clipboard plugin on your own.
- Decoration rebuild on the resolution effect causes visible flicker or an
  infinite rebuild loop — report the transaction pattern; do not debounce-hack.

## Maintenance notes

- The 5-level upward walk + `attachments/` probe is a heuristic, not vault
  semantics. If the operator's notes ever miss, the knob is the search list in
  `resolve_embed` (one Rust function) — not the JS layer.
- Plan 009 (interactive Properties) is independent of this plan.
- Reviewer should scrutinize: the resolver cache never grows per keystroke
  (key is dir+name, not doc position), `resolve_embed`'s traversal guard, and
  that `save_binary` cannot silently overwrite an existing pasted file
  (timestamped names make collisions practically impossible — but a same-second
  double-paste should either dedupe (suffix) or overwrite knowingly; executor
  picks one and documents it in the report).

## Review — 2026-07-17

**Verdict: CHANGES REQUESTED — one item, caught by code-read before the
operator smoke.**

Reviewed range `main..feat/008-images` (4 commits, one per step). Independently
verified: gates all green (typecheck, **86/86 tests**, build, `cargo check`);
working tree clean WITH the `git status` output included in the report as
instructed — commit hygiene finally observed, noted with approval; only the
authorized `base64` crate added; orphan `readTextFile` import removed;
`resolve_embed` has the traversal guard and the ≤5-level + `attachments/`
walk exactly per design; `embedResolver` cache/pending/injection matches the
design (errors cache as `null` — no retry spam); `save_binary` guards the
parent dir and uses temp+rename (same-second collision = knowing overwrite via
rename; acceptable, timestamped names make it practically unreachable — note
it in the walkthrough next time as the plan asked); paste listener and helpers
(`Pasted image YYYYMMDD-HHMMSS.png`, `%20` encoding) correct.

**Blocking item — resolved absolute paths get mangled by `resolveImageSrc`.**
`links.ts` renders a resolved embed with `new ImageWidget(resolved, basePath)`
where `resolved` is an ABSOLUTE path from `resolve_embed` (often in a PARENT
directory, e.g. `C:\vault\Screenshot.png` while basePath is
`C:\vault\wiki\concepts`). `ImageWidget.toDOM` → `resolveImageSrc(url,
basePath)` has no absolute-path detection, so it joins:
`C:\vault\wiki\concepts\C:\vault\Screenshot.png` — a broken path. Every
resolved embed will fail to display despite correct resolution. Tests missed it
because they assert the widget's existence, not its resolved src.

**Correction (one commit `008: absolute-path passthrough in resolveImageSrc`):**
1. In `resolveImageSrc`, before the join, detect an absolute LOCAL path and
   return it unchanged (no decode — it is a real filesystem path, not a
   markdown URL): drive-letter form (`/^[a-zA-Z]:[\\/]/`), UNC (`^\\\\`), or
   leading `/` (posix).
2. Add unit tests:
   `resolveImageSrc("C:\\vault\\pic.png", "C:\\notes\\sub") === "C:\\vault\\pic.png"`;
   existing relative-join and `%20` cases stay green.
3. Gates green.

After that lands: operator runs the Step 5 smoke (items 1–6) and this plan
closes on their confirmation.

## Correction round 2 — 2026-07-17 — smoke results: two fixes (evidence attached)

Smoke: **paste PASS** (image saved next to the note, renders, persists across
save/close/reopen). Two failures, both root-caused by the reviewer with direct
evidence:

**S1 — embeds still don't render: the attachment folder is configured in
Obsidian, not guessable.** The reviewer located the actual file on disk:
`G:\My Drive\My_LLM_WIKI\raw\assets\Screenshot 2026-06-17 111140.png`, and the
vault's own config `G:\My Drive\My_LLM_WIKI\.obsidian\app.json` contains
`"attachmentFolderPath": "raw/assets"`. Our search (note dir → `attachments/` →
≤5 parents) can never see `<vaultRoot>/raw/assets/`. Fix `resolve_embed` to
read Obsidian's config when it finds the vault root:

- Keep the existing per-ancestor checks (`dir/<name>`, `dir/attachments/<name>`).
- ADD, at each ancestor: if `dir/.obsidian` exists (that ancestor IS the vault
  root), read `dir/.obsidian/app.json` (parse with the already-present
  `serde_json`) and take `attachmentFolderPath`:
  - plain form (`"raw/assets"`) → check `<dir>/<attachmentFolderPath>/<name>`;
  - `"./"` → same-folder-as-note (already covered by the base check — skip);
  - `"./sub"` → check `<base_dir>/sub/<name>` (relative to the NOTE's folder);
  - file missing / parse error / key absent → skip silently (fall through);
  - after handling a `.obsidian` level, `break` (nothing above a vault root).
- **Rust unit test (std-only, no new deps):** in `lib.rs` `#[cfg(test)]`,
  build a temp vault (`std::env::temp_dir()` + unique suffix):
  `vault/.obsidian/app.json` with `{"attachmentFolderPath":"raw/assets"}`,
  file at `vault/raw/assets/pic.png`, note dir `vault/wiki/concepts` →
  `resolve_embed(note_dir, "pic.png")` returns the `raw/assets` path; plus a
  negative case (no config, file nowhere → None). Run with `cargo test`.

**S2 — selection STILL unreadable in dark mode: our override never actually
won.** The block color in the operator's screenshots is `#d7d4f0` — CodeMirror's
BASE default, not our `--uv-selection`. Root cause: the base theme's rule uses a
higher-specificity selector
(`&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground`)
than both of our rules, so ours lose in the cascade — in light mode the default
happened to be readable, masking this since plan 005. Fix in
`src/theme/editorTheme.ts`: replace the two `.cm-selectionBackground` rules with
ONE rule using the full-specificity selector set (the pattern the official
oneDark theme uses):

```ts
"&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
  backgroundColor: "var(--uv-selection)"
}
```

Verify visually in BOTH modes: selected text keeps its text color with a
purple-tinted translucent background, focused and unfocused.

Commits: `008: read Obsidian attachmentFolderPath in resolve_embed` and
`008: selection override with full-specificity selector`. Gates + `cargo test`
green; `git status` clean + included in the report. Then the operator re-runs
smoke items 1 and 6 (embedded screenshots must render in the real wiki note)
and the dark-mode selection check.

## Correction round 3 — 2026-07-17 — paste redesign: central asset store (operator decision)

The operator reconsidered the paste mechanism. Product rationale: Unvaulted's
whole point is SCATTERED standalone `.md` files; per-note `assets/` folders (or
siblings) would force vault-like organization. Decision: **a central,
Unvaulted-owned asset store** — with two reviewer adjustments the operator
accepted:

- Location is the per-user **app-data dir**, NOT the install dir (install dirs
  are wiped on update/uninstall): `app_data_dir()/assets/` via Tauri's path
  resolver (`app.path().app_data_dir()` from an `AppHandle` command argument),
  auto-created on first use.
- The inserted markdown is an **Obsidian-style embed** `![[Pasted image
  YYYYMMDD-HHMMSS.png]]` — NOT a machine-specific absolute path. The embed
  resolver (S1) gains ONE more probe, unifying both worlds (vault files AND
  Unvaulted pastes) under one mechanism, and the note renders from any location
  on this machine.

**Changes (supersedes the shipped beside-the-note paste of Steps 1/3):**

1. `save_binary` → repurpose/rename to save into the central store:
   `save_pasted_image(app: tauri::AppHandle, file_name: String, contents_base64: String)
   -> Result<String, String>` — builds `app_data_dir()/assets/`,
   `create_dir_all`, writes via the existing temp+rename pattern, returns the
   full path. Filename validation as in `resolve_embed` (reject separators/`..`).
2. `resolve_embed` → add a FINAL fallback probe after all existing ones:
   `app_data_dir()/assets/<file_name>` (command gains an `AppHandle` arg).
   Also: accept an EMPTY `base_dir` (untitled buffer) — skip the ancestor walk
   entirely and probe only the central store.
3. `links.ts` embed branch → drop the `basePath` non-empty requirement: when
   basePath is empty (untitled), still queue resolution with `baseDir: ""`
   (Rust handles it per #2). Update the "no basePath → never queued" test to
   the new behavior (queued with empty baseDir).
4. Paste flow (`main.ts`) → REMOVE the "save first" gate and the note-dir
   logic: always `save_pasted_image` → insert `imageMarkdownFor` changed to the
   embed form: `![[<name>]]` (no `%20` needed — wikilink syntax tolerates
   spaces; update its unit test). Paste now works in untitled buffers too.
5. Keep the `Pasted image YYYYMMDD-HHMMSS.png` naming (unchanged helper).
6. Migration note: the few images pasted beside notes during earlier smoke
   remain valid (`![](name.png)` relative rendering is untouched); no migration
   needed.
7. Tests: adjust `embeds.test.ts` (empty-basePath case now queues),
   `fileSession.test.ts` (`imageMarkdownFor` → `![[name]]`), and extend the
   Rust `#[cfg(test)]` from round-2 S1 only if cheap (the AppHandle-dependent
   probe is hard to unit-test — the operator smoke covers it; say so in the
   report rather than faking it).

**Deferred to backlog (operator decision): orphan cleanup** — on save, detect
`Pasted image *` files in the central store no longer referenced by any open
note and prompt to delete. Recorded as backlog candidate 010 in
`plans/README.md`; do NOT implement here.

Commit: `008: central asset store for pasted images (app-data + embed syntax)`.
Gates + `cargo check`/`cargo test` green; `git status` clean + in the report.
Operator smoke afterward: (a) wiki-note screenshots render (S1), (b) dark-mode
selection readable (S2), (c) paste into a SAVED note → file lands in
`%APPDATA%\Unvaulted\assets\`, `![[...]]` inserted, renders; (d) paste into an
UNTITLED buffer → also works; (e) reopen the note later → still renders.