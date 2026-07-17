# Plan 009: Polish — cursor past frontmatter, `.txt` support, transparent icon

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. STOP
> conditions are binding. Run `git status` before the completion report and
> include its output. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plan 008 must be DONE in `plans/README.md`.
> `src/session/fileSession.ts` must export `dirOf`, `pastedImageName`,
> `imageMarkdownFor`; `src-tauri/tauri.conf.json` must contain
> `fileAssociations` with `md`/`markdown`. `npm test` green before starting.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/008-images-embed-render-and-paste.md
- **Category**: polish / small features
- **Planned at**: 2026-07-17 (stamp the exact `git rev-parse --short HEAD` of
  main at branch time in your first commit message)

## Why this matters

Three operator findings from daily use after 008:

1. Opening a note that starts with frontmatter shows raw YAML until the user
   clicks — because the load places the cursor at offset 0, inside the
   frontmatter block, and the reveal rule (correctly) shows raw syntax at the
   selection. The fix is placement, not the reveal rule.
2. The operator wants `.txt` files (Notepad's turf) to be openable with
   Unvaulted — same handler etiquette as `.md` (listed in "Open with", never
   stealing the default).
3. The taskbar icon sits on a white box: the current logo source is RGB
   (no alpha). The operator will supply a re-exported transparent RGBA PNG.

## Scope

**In scope:** `src/session/fileSession.ts` (+helper, +tests), `src/main.ts`
(loadPath cursor placement), `src/session/platform.ts` (dialog filters),
`src-tauri/src/lib.rs` (`get_open_path` extension check),
`src-tauri/tauri.conf.json` (`fileAssociations`), `src/logo/**` +
`src-tauri/icons/**` (Step 3, contingent).

**Out of scope:** everything else — no preview/theme/editor behavior changes.

## Steps (one commit per step, prefix `009:`)

### Step 1: Cursor lands after frontmatter on load

- Pure helper in `fileSession.ts`:
  `frontmatterEndOffset(text: string): number` — if the text starts with a
  `---` line, return the offset just AFTER the closing `---` line's newline
  (i.e. the start of the body); if no frontmatter (no leading `---` or no
  closing fence), return 0. Unit-test: doc with frontmatter → offset of body
  start; no frontmatter → 0; unterminated fence → 0; frontmatter only (no
  body) → end of doc.
- In `main.ts` `loadPath`: after dispatching the document change, dispatch a
  selection to `frontmatterEndOffset(newState.currentText)` (single cursor).
- **Verify**: `npm test` green; dev smoke — opening a frontmatter note shows
  the Properties CARD immediately (cursor sits on the first body line).

### Step 2: `.txt` support (handler etiquette unchanged)

- `tauri.conf.json` `fileAssociations`: add a second entry
  `{ "ext": ["txt"], "name": "Text", "description": "Text document",
  "role": "Editor" }` (keep the Markdown entry as is).
- `lib.rs` `get_open_path`: accept `.txt` alongside `.md`/`.markdown`
  (case-insensitive, as now).
- `platform.ts`: open dialog filters → Markdown (`md`,`markdown`), Text
  (`txt`), All Files (`*`); save dialog filters → the same three (Notepad-like
  Save As).
- **Verify**: `cargo check` + gates green; dev smoke — Ctrl+O can pick a
  `.txt` and it opens/renders (plain text = paragraphs; fine); Ctrl+S on it
  saves. (Full association behavior is verified at the next installer build —
  note that in the report, don't build the installer in this plan.)

### Step 3: Regenerate icons from the transparent logo — CONTINGENT

Gate: run `file "src/logo/black logo.png"` (or PowerShell equivalent) — it
must report **RGBA**. If it still reports RGB, STOP this step and report (the
operator must re-export; do not fake transparency). When RGBA:
`npx tauri icon "src/logo/black logo.png"`, commit source + regenerated
`src-tauri/icons/**`, delete the stale dev exe
(`src-tauri\target\debug\Unvaulted.exe`).
- **Verify**: operator sees the taskbar icon without the white box (dev run).

## Done criteria

- [ ] Gates (`npm run typecheck && npm test && npm run build`, `cargo check`,
      `cargo test`) all green
- [ ] `frontmatterEndOffset` tests cover the 4 specified cases
- [ ] Opening a frontmatter note shows the Properties card without clicking
      (operator confirms)
- [ ] `.txt` opens via Ctrl+O and via CLI arg; Save As offers md/txt/all
- [ ] Step 3 either done (RGBA verified) or cleanly reported as blocked-on-asset
- [ ] `git status` clean; output in the report

## STOP conditions

- Plan 008 not DONE/merged.
- Step 3's logo still RGB — skip that step with a report, do NOT proceed to
  fake it (e.g. by editing pixels).
- Anything requiring new dependencies.

## Maintenance notes

- The `.txt` association ships to users at the NEXT installer build (post-plan
  rebuild + reinstall); the reviewer will fold that into the release step.
- If more extensions are ever wanted (`.mdx`, `.text`), the three touch points
  in Step 2 are the complete list.
## Review — 2026-07-17

**Verdict: PASS.**

Reviewed `main..feat/009-polish` (3 commits, one per step). Verified
independently: gates green (typecheck, **90/90 JS tests**, build, `cargo test`
2/2); `frontmatterEndOffset` handles CRLF and EOF-fence cases with 4 new unit
tests; `.txt` wired at all three touch points (fileAssociations, `get_open_path`
case-insensitive, open/save dialog filters md/txt/all); icons regenerated from
the verified-RGBA logo (committed together, stale dev exe removed). The
reported `Cargo.toml` "modification" was a phantom (line-ending only, empty
diff) — executor's judgment to leave it alone was correct. Operator smoke: all
three items confirmed (Properties card forms immediately on open, Save As
offers md/txt/all, taskbar icon clean without the white box).

**Plan 009 complete — merging to `main`.** Release step next: rebuild the
installer so the daily-driver app picks up plans 008+009.
