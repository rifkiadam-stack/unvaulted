# Plan 013: Combined open-dialog filter + wider non-default "Open with" registration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. STOP
> conditions are binding. Run `git status` before the completion report and
> include its output. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plan 012 must be DONE/merged (README row).
> `src/session/fileSession.ts` must export `isMarkdownPath`. `npm test`
> green before starting (114 tests at plan time).

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/012-plain-text-mode-for-txt.md
- **Category**: feature (UX polish)
- **Planned at**: stamp `git rev-parse --short HEAD` of main at branch time

## Why this matters

Operator findings 2026-07-18, after plan 012 landed plain-text mode:

1. The Open dialog's default filter is "Markdown", so `.txt` files are
   invisible until the user switches the bottom-right dropdown. Everything
   Unvaulted opens should be visible by default.
2. Since 012, ANY text file renders safely (non-md → plain mode). The
   operator wants people to DISCOVER that: register Unvaulted in Windows'
   "Open with" list for common plain-text formats — **strictly non-default**
   (role "Editor", the same etiquette as the existing md/txt entries; the
   installer never steals anyone's default handler).

## Product decisions (locked, operator 2026-07-18)

- Open dialog: new FIRST filter **"All supported"** = `md, markdown, txt`.
  The existing Markdown / Text / All Files filters stay below it. (`json`
  etc. deliberately NOT in this filter — they stay reachable via "All
  Files" and drag-drop; the filter reflects the product's identity.)
- New "Open with" registrations (in ADDITION to existing md/markdown/txt):
  **`json`, `csv`, `log`, `xml`, `yml`, `yaml`, `ini`** — one association
  entry, role "Editor", never default.
- The Rust CLI whitelist MUST be extended to the same set — otherwise
  picking Unvaulted from "Open with" on a `.json` opens an EMPTY window
  (the plan-006-era bug class). The full accepted set becomes:
  `md, markdown, txt, json, csv, log, xml, yml, yaml, ini`.
- Save dialog filters: UNCHANGED (Markdown / Text / All Files).

## Current state

- `src/session/platform.ts:50-66` — `showOpenDialog` filters:

```ts
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown']
        }, {
          name: 'Text',
          extensions: ['txt']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
```

  (`showSaveDialog` at lines 67-80 has the same three — leave it alone.)

- `src-tauri/src/lib.rs:2-5` — `get_open_path` extension whitelist:

```rust
fn get_open_path() -> Option<String> {
    ...
        if (arg_lower.ends_with(".md") || arg_lower.ends_with(".markdown") || arg_lower.ends_with(".txt")) && std::path::Path::new(&arg).exists() {
```

- `src-tauri/tauri.conf.json` — `bundle.fileAssociations` currently has two
  entries: Markdown (`md`, `markdown`) and Text (`txt`), each with
  `"role": "Editor"`.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Typecheck | `npm run typecheck`                      | exit 0              |
| Tests     | `npm test`                               | 114 pass            |
| Build     | `npm run build`                          | exit 0              |
| Rust      | `cargo check --manifest-path src-tauri/Cargo.toml` | exit 0    |

## Scope

**In scope** (the only files you may modify):
- `src/session/platform.ts` (open-dialog filters only)
- `src-tauri/src/lib.rs` (`get_open_path` whitelist only)
- `src-tauri/tauri.conf.json` (`fileAssociations` only)

**Out of scope** (do NOT touch):
- `showSaveDialog` — stays as-is (operator decision).
- Anything in `src/` beyond the one filters array — rendering for these
  files is already handled by plan 012's plain mode; no editor changes.
- NSIS/installer settings other than `fileAssociations`.

## Git workflow

- Branch: `feat/013-open-filters` from `main`.
- One commit per step, prefix `013:`.
- Do NOT push or merge.

## Steps

### Step 1: Combined default filter in the Open dialog

In `showOpenDialog` (platform.ts), prepend one filter so the list becomes:

```ts
        filters: [{
          name: 'All supported',
          extensions: ['md', 'markdown', 'txt']
        }, {
          name: 'Markdown',
          extensions: ['md', 'markdown']
        }, {
          name: 'Text',
          extensions: ['txt']
        }, {
          name: 'All Files',
          extensions: ['*']
        }]
```

**Verify**: gates green. Dev smoke: Ctrl+O → dialog opens with "All
supported" preselected; a folder containing both `.md` and `.txt` shows BOTH
without touching the dropdown.

### Step 2: Extend the Rust CLI whitelist

In `get_open_path`, replace the three `ends_with` checks with a check
against the full set (keep it readable — e.g. a `const` slice + `iter().any`):
`.md .markdown .txt .json .csv .log .xml .yml .yaml .ini`
(case-insensitive as now — `arg_lower` already lowercases; the `exists()`
check stays).

**Verify**: `cargo check` exit 0. Dev smoke:
`npm run tauri dev -- -- somefile.json` is awkward — instead verify after
Step 3's build OR by temporarily running the debug exe with a `.json`
argument: the file opens in plain mode (literal text).

### Step 3: Register the additional "Open with" associations

In `tauri.conf.json` `bundle.fileAssociations`, ADD one entry (keep the two
existing entries byte-identical):

```json
{
  "ext": ["json", "csv", "log", "xml", "yml", "yaml", "ini"],
  "name": "Plain text formats",
  "description": "Plain text document",
  "role": "Editor"
}
```

**Verify**: `npm run tauri build` exits 0 and produces the NSIS installer
(this plan's build IS needed for association testing, but do NOT install it —
note in the report that install-level verification happens at release).
`cargo check` still green.

## Test plan

No new JS/Rust unit tests required (no new logic — data-only changes; the
whitelist change is config-like). The 114 existing tests must stay green.
Manual verification per step as listed; final association behavior
(right-click a `.json` → Open with shows Unvaulted; double-click default
UNCHANGED) is verified by the operator after the next release install.

## Done criteria

- [ ] `npm run typecheck` && `npm test` (114) && `npm run build` exit 0
- [ ] `cargo check` exit 0
- [ ] Open dialog shows "All supported" first; md+txt visible together
- [ ] `get_open_path` accepts all ten extensions, still case-insensitive,
      still requires the file to exist
- [ ] `fileAssociations` has exactly 3 entries, all `"role": "Editor"`
- [ ] `git status` clean; output in the report

## STOP conditions

- Any temptation to change `showSaveDialog` or add the new extensions to
  the "All supported" filter — both are locked operator decisions.
- Any change to `isMarkdownPath` or `src/` rendering paths — plain-mode
  handling of these files already works; if it seems not to, STOP and
  report instead of patching.

## Maintenance notes

- The extension set now lives in THREE places that must stay in sync:
  open-dialog "All supported" filter (md/markdown/txt only — intentional
  subset), `get_open_path` whitelist, and `fileAssociations`. A future
  extension addition must touch the last two together.
- Reviewer: after merge, update `docs/PANDUAN-UNVAULTED.md` (open-dialog
  behavior + "file lain seperti json tampil apa adanya") and rebuild the
  installer + refresh `installer/`.

## Review — 2026-07-18

**Verdict: PASS.**

Reviewed `main..feat/013-open-filters` (3 commits, one per step). Verified
independently: gates green (typecheck, 114/114, build, `cargo check`); diff
is exactly the three data changes — "All supported" filter prepended (open
dialog only, save dialog untouched), Rust whitelist as a readable const
slice covering all ten extensions (case-insensitive + exists() preserved),
one new fileAssociations entry with `"role": "Editor"`. Both locked
decisions honored. Install-level association behavior (right-click a
`.json` → Open with lists Unvaulted; default handler unchanged) is verified
by the operator after the release install.

**Plan 013 complete — merging to `main`.** Release: docs note + installer
rebuild + `installer/` refresh follow immediately.
