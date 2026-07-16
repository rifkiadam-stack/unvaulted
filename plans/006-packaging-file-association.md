# Plan 006: Windows installer (NSIS) and `.md` file association

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: ALL of plans 001–005 must be DONE in
> `plans/README.md`, and the full baseline must pass before you start:
> `npm run typecheck && npm test && npm run build` and `cargo check` in
> `src-tauri/`. This plan ships what exists — it must not change app behavior.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (configuration + verification; no app logic)
- **Depends on**: plans/001–005 (all)
- **Category**: distribution
- **Planned at**: commit `91467ad`, 2026-07-06

## Why this matters

The product promise starts at Explorer: **double-click a `.md` file and Unvaulted
opens it** — that's the "Notepad for markdown" moment. This plan produces the
Windows installer (NSIS, via Tauri's bundler) that registers Unvaulted as an
"Open with" handler for `.md`/`.markdown` **without hijacking the user's default
app**, and verifies the full install → open → uninstall lifecycle.

## Current state

After plans 001–005:

- Working app: `npm run tauri dev` opens a window; a file path passed as a CLI
  argument is loaded on startup (plan 004's `get_open_path` reads
  `std::env::args().nth(1)` — the file association below delivers exactly that).
- `src-tauri/tauri.conf.json` has `productName: "Unvaulted"`, identifier
  `com.rifkiadam.unvaulted`, default bundle config from `tauri init` (plan 001) —
  **no bundle targets, no fileAssociations configured yet**.
- Icons: whatever `tauri init` generated (default Tauri icons) — acceptable for
  MVP; a custom icon is optional (see Step 1).

Locked product decisions this plan implements:

- Windows-only MVP; **NSIS** installer target (`.exe` setup, per-user install).
- Register as **"Open with" handler** for `.md` and `.markdown`; do NOT force
  default (the installer must not steal the association from the user's current
  default app; Windows lets the user choose Unvaulted as default themselves).
- WebView2: installer bootstraps it when missing (Tauri NSIS default
  `downloadBootstrapper`) — no action needed beyond not disabling it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Full baseline | `npm run typecheck && npm test && npm run build` | exit 0 |
| Build installer | `npm run tauri build` | exit 0; NSIS `.exe` under `src-tauri/target/release/bundle/nsis/` |
| Inspect config | `npx tauri info` | prints env + config sanity |

Note: `npm run tauri build` compiles Rust in release mode — the first run takes
several minutes; that is normal, not a hang.

## Scope

**In scope:**
- `src-tauri/tauri.conf.json` (modify) — `bundle` section only: targets,
  fileAssociations, publisher/copyright metadata, (optionally) icon paths.
- `src-tauri/icons/**` (optional, only if replacing default icons — see Step 1).
- `plans/006-verification-checklist.md` (new) — the filled-in manual checklist
  from Step 3 (this plan's lasting verification artifact).

**Out of scope (do NOT touch):**
- ANY file under `src/`, `tests/`, or `src-tauri/src/` — zero behavior changes.
  If association-launch doesn't load the file, that's a plan-004 defect: STOP and
  report, don't patch here.
- Code signing (no certificate exists; unsigned MVP accepts the SmartScreen
  warning — document it in the checklist).
- Auto-update, MSI target, macOS/Linux bundles, Microsoft Store.

## Steps

### Step 1: Bundle configuration

In `src-tauri/tauri.conf.json`, configure the `bundle` section:

```json
"bundle": {
  "active": true,
  "targets": ["nsis"],
  "publisher": "Rifki Adam",
  "copyright": "© 2026 Rifki Adam",
  "shortDescription": "Standalone Obsidian-style markdown editor",
  "fileAssociations": [
    {
      "ext": ["md", "markdown"],
      "name": "Markdown",
      "description": "Markdown document",
      "role": "Editor"
    }
  ],
  "windows": {
    "nsis": { "installMode": "currentUser" }
  }
}
```

(Field names follow the Tauri v2 config schema — validate with `npx tauri info`
and the schema errors `tauri build` emits; adjust key placement to the installed
minor version if the schema moved, recording any deviation. `installMode:
currentUser` = per-user install, no admin prompt.)

Icons: keeping the default Tauri icons is acceptable for MVP. If you replace
them, generate via `npx tauri icon <source.png>` from a single 1024×1024 source
and commit the generated `src-tauri/icons/`; do not hand-edit individual sizes.

> **Amendment 2026-07-14 — operator supplied a real logo; use it.** The
> operator added `src/logo/Unvaulted Logo.png` (2048×2048 RGBA — valid source).
> In Step 1, run `npx tauri icon "src/logo/Unvaulted Logo.png"` and commit BOTH
> the source PNG and the regenerated `src-tauri/icons/` (this adds `src/logo/**`
> to this plan's in-scope list). The quoted path matters — it contains a space.
> After building, verify the installer/EXE and the window/taskbar show the new
> icon (add this to the Step 3 checklist as item 11).
>
> **Amendment update 2026-07-16 — logo REPLACED.** The operator superseded the
> first logo with `src/logo/black logo.png` (2048×2048 RGBA, validated;
> currently untracked). The icon set in `src-tauri/icons/` was generated from
> the OLD logo during plan 007 — regenerate it here:
> 1. `npx tauri icon "src/logo/black logo.png"` (quoted — path has a space).
> 2. `git rm "src/logo/Unvaulted Logo.png"` (superseded; operator says it's
>    no longer wanted) and commit the new source + regenerated
>    `src-tauri/icons/**` together: `006: regenerate icons from final logo`.
> 3. Delete the stale dev exe (`src-tauri\target\debug\app.exe`) so the next
>    dev run embeds the new icon; the release build embeds it regardless.
> 4. Step 3 checklist item 11 now verifies the NEW (black) logo appears as the
>    installer icon, window/titlebar icon, and taskbar icon.

**Verify**: `npm run tauri build` → exit 0; `.exe` installer exists under
`src-tauri/target/release/bundle/nsis/`.

### Step 2: Release-build smoke

Run the built app **directly** (`src-tauri/target/release/unvaulted.exe`):

1. Bare launch → empty state, title `Unvaulted`.
2. `unvaulted.exe C:\path\to\note.md` from a terminal → opens with the note
   rendered (live preview + theme active — release build parity with dev).

**Verify**: both behaviors correct; report.

### Step 3: Install → associate → open → uninstall (the real test)

Run the NSIS installer, then execute this checklist and save the filled-in copy
as `plans/006-verification-checklist.md` (each item: PASS/FAIL + note):

1. Installer runs per-user (no UAC admin prompt) and completes.
2. Start menu entry "Unvaulted" exists and launches the app.
3. In Explorer, right-click a `.md` file → **Open with** lists Unvaulted.
4. "Open with → Unvaulted" opens the app with that file loaded and rendered.
5. The **existing default** `.md` handler is unchanged (double-click still opens
   whatever it opened before installation — verify BEFORE and AFTER install).
6. Set Unvaulted as default via Windows "Open with → Always" → double-click now
   opens Unvaulted with the file.
7. Open two different `.md` files → two independent windows.
8. SmartScreen behavior on first run recorded (unsigned build — "More info →
   Run anyway" expected; note the exact prompt).
9. Uninstall (Settings → Apps) completes; app gone from Start menu; `.md` files
   open again with the pre-install default; no orphaned "Unvaulted" entry left in
   "Open with" (or note if Windows keeps a stale entry — known Windows behavior,
   record what you observe).
10. Re-run `npm run typecheck && npm test` → still green (nothing broke).

**Verify**: checklist file committed; every line PASS or explained.

## Test plan

This plan's verification is the Step 3 checklist artifact — packaging cannot be
meaningfully unit-tested. The committed checklist is the record; done criteria
below make it machine-checkable at the repo level.

## Done criteria

- [ ] `npm run tauri build` exits 0 and produces an NSIS `.exe`
- [ ] `git diff` for this plan touches ONLY `src-tauri/tauri.conf.json`,
      (optionally) `src-tauri/icons/**`, and `plans/006-verification-checklist.md`
- [ ] `plans/006-verification-checklist.md` exists with all 10 items filled in
- [ ] Items 3, 4, 5 (Open-with listed / opens file / default not stolen) are PASS
- [ ] `npm run typecheck && npm test` exit 0 after everything
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any of plans 001–005 is not DONE, or the baseline fails before you start.
- The Tauri v2 bundler schema has no working `fileAssociations` for NSIS in the
  installed version (report the schema section you found).
- Checklist item 4 fails (file association launches app but the file doesn't
  load) — that's plan 004's CLI-path contract breaking; report, don't hotfix.
- Checklist item 5 fails (installer stole the default) — report the exact NSIS
  behavior; do not ship an association-stealing installer.

## Maintenance notes

- Code signing is the known next step for distribution (removes SmartScreen
  friction); when a certificate exists, it slots into `bundle.windows`
  (`certificateThumbprint` / `signCommand`) with no other changes.
- macOS/Linux later: add targets to `bundle.targets` and per-OS association
  config; the CLI-path open contract (plan 004) is already cross-platform.
- Reviewer should scrutinize: the checklist's items 5 and 9 (association
  etiquette) — they are the difference between a polite app and a rude one.

## Correction round 1 — 2026-07-16 — install-test findings (registry-diagnosed)

Operator installed and tested. Titlebar shows the new logo (exe embed correct)
and the app runs, but: "Open with → Unvaulted" opens the app WITHOUT loading
the file (checklist item 4 FAIL); taskbar + Open-With menu icons show the OLD
logo; the app installed to `C:\Program Files (x86)\Unvaulted\` (not per-user).
Reviewer inspected the registry directly; root causes are concrete:

**R1 — the binary is named `app.exe` (generic name collision).** The ProgId
command is correctly registered (`C:\Program Files (x86)\Unvaulted\app.exe "%1"`),
but Explorer's per-extension MRU (`FileExts\.md\OpenWithList`) stores the bare
name `app.exe` — which Windows can resolve to a DIFFERENT app.exe (e.g. the old
dev/release build under the repo's `target\` — explains the old icon on the
taskbar and in the Open-With menu, and launching a stale build). Fix: give the
binary a unique name — add top-level `"mainBinaryName": "Unvaulted"` to
`src-tauri/tauri.conf.json` (Tauri v2 key). The installed exe becomes
`Unvaulted.exe`; the bundler updates the ProgId command automatically.

**R2 — file never loads from association/CLI while Ctrl+O works (fs scope).**
The dialog plugin auto-extends the fs scope for files the user picks — that is
why Ctrl+O reads fine. An association/CLI path gets NO such runtime grant and
`readTextFile` (plugin-fs) is refused by the static scope, silently caught by
`loadPath`'s catch → empty state. Fix consistent with how writes already work
(`save_atomic` is a custom command bypassing plugin scope): add a Rust command
`read_file(path: String) -> Result<String, String>` using
`std::fs::read_to_string`, register it, and switch `platform.readFile` to
`invoke('read_file', { path })`. Also make `get_open_path`'s extension check
case-insensitive (`.MD` files are legal). Add/adjust the fileSession-level test
only if any pure logic changed (likely none — this is shell wiring).

**R3 — uncommitted state AGAIN.** The bundle config (`targets: ["nsis"]`,
`fileAssociations`, `installMode: currentUser`, publisher metadata) and
`plans/006-verification-checklist.md` exist only in the working tree. The
installer was built from uncommitted config — a clean clone cannot reproduce
this build. Commit them (config change + checklist skeleton), plus the R1/R2
changes, each as its own commit prefixed `006:`. This is the third occurrence
of ship-from-uncommitted-state (004 deps, 007 protocol-asset) — run
`git status` before EVERY completion report and include its output.

**R4 — install landed in `Program Files (x86)` despite
`installMode: currentUser`.** Possibly the operator changed the directory in
the installer UI, or elevation kicked in. After R1–R3, rebuild and re-test;
checklist item 1 (per-user, no UAC) decides. If the fresh installer still
defaults to Program Files (x86), report the installer's shown default directory
— do not guess at NSIS internals.

**Re-test sequence (operator, after the rebuild):**
1. Uninstall the current "Unvaulted" (Settings → Apps) — removes the
   Program Files (x86) install.
2. Refresh the icon cache: run `ie4uinit.exe -show` (or sign out/in) — clears
   the stale old-logo entries.
3. Install the NEW setup exe; re-run the full checklist 1–11. Item 4 must now
   load the file; taskbar/Open-With icons must show the new logo (the
   `Unvaulted.exe` name registers fresh, bypassing the stale `app.exe` MRU).
