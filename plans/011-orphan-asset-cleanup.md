# Plan 011: Orphan pasted-image cleanup on save

> **Executor instructions**: Follow this plan step by step. STOP conditions
> are binding. Run `git status` before the completion report and include its
> output. Leave the `plans/README.md` status row to the reviewer.
>
> **Drift check (run first)**: plan 010 must be DONE. `src/session/
> fileSession.ts` must export `pastedImageName`; `src-tauri/src/lib.rs` must
> contain `save_pasted_image` and the central store under
> `app_data_dir()/assets`. `npm test` green before starting.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW-MED (deletes user files — must be prompt-gated and narrow)
- **Depends on**: plans/010-interactive-properties.md
- **Category**: feature (hygiene)
- **Planned at**: stamp `git rev-parse --short HEAD` of main at branch time

## Why this matters

Pasted images live in the central store (`app_data_dir()/assets`). When the
operator deletes a `![[Pasted image ...]]` reference from a note, the file
lingers forever. Operator wants a prompt on save: "also delete the image
file(s)?" — Obsidian-like hygiene without a vault index.

## Design — what "orphan" can safely mean here

Unvaulted has no index of all notes, so global orphan detection is impossible.
The SAFE, knowable signal: **a pasted-image reference that existed in this
file's last-saved text and is gone from the text being saved now.** Only those
candidates are offered for deletion, only `Pasted image *.png`-patterned names,
and only from the central store — never arbitrary paths. The user confirms per
save (Yes deletes ALL listed; No keeps files; the save itself happens either
way, BEFORE the prompt).

## Scope

**In scope:** `src/session/fileSession.ts` (+pure helper, +tests),
`src/main.ts` (`doSave` hook + confirm), `src/session/platform.ts`
(`deletePastedImages`), `src-tauri/src/lib.rs` (`delete_pasted_image` command
+ unit test), `src/theme/theme.css` only if the confirm reuses `uv-modal`
styling (it should — reuse the plan-004 modal pattern with Yes/No).

**Out of scope:** scanning other notes; deleting non-`Pasted image` files;
any background/startup cleanup; undo.

## Steps (one commit per step, prefix `011:`)

### Step 0: Relocate the central store to `Pictures\Unvaulted` (operator decision 2026-07-17)

The store moves from the hidden `app_data_dir()/assets` to a user-visible,
browsable location: **`picture_dir()/Unvaulted`** (flat — no `assets` subdir).
Rationale: the operator could not find the AppData store; pictures belong in
Pictures; survives updates; OneDrive-backed when Pictures is synced.

- Introduce ONE Rust helper used by every store-touching command:
  `fn asset_store_dir(app: &tauri::AppHandle) -> Result<PathBuf, String>` —
  fallback chain (operator wants Pictures created if missing, 2026-07-17):
  1. `picture_dir()/Unvaulted` + `create_dir_all` — note this CREATES the
     Pictures folder too if it is physically missing;
  2. if `picture_dir()` itself errors (known-folder API failure): try
     `%USERPROFILE%\Pictures\Unvaulted` + `create_dir_all` (via `home_dir()`);
  3. only if both fail: legacy `app_data_dir()/assets`.
- `save_pasted_image` → writes to `asset_store_dir`.
- `resolve_embed` → its store fallback probes `asset_store_dir` FIRST, then the
  legacy `app_data_dir()/assets` (read-only, so existing `![[Pasted image ...]]`
  references keep resolving; no file migration).
- Step 2's `delete_pasted_image` (below) → deletes from `asset_store_dir`,
  and if not present there, from the legacy dir (same strict name validation).
- Verify: paste in dev → file appears in `%USERPROFILE%\Pictures\Unvaulted\`;
  an OLD note referencing a legacy-store image still renders it.

### Step 1: Pure diff helper + tests

`fileSession.ts`:
```ts
export function pastedImageRefs(text: string): Set<string>;
  // every `![[Pasted image ....png]]` target in the text (exact name strings;
  // pattern: /!\[\[(Pasted image \d{8}-\d{6}\.png)\]\]/g)
export function droppedPastedImages(before: string, after: string): string[];
  // refs(before) minus refs(after), sorted
```
Tests: extraction (multiple, none, malformed names ignored — e.g.
`![[Pasted image evil/../x.png]]` does NOT match the pattern); diff cases
(dropped one, dropped none, added one → empty, same ref repeated twice then
one removed → still present ⇒ NOT dropped).

**Verify**: `npm test` all pass.

### Step 2: Rust delete command + unit test

`delete_pasted_image(app: AppHandle, file_name: String) -> Result<(), String>`:
validate `file_name` against the strict pattern
(`Pasted image ` + 8 digits + `-` + 6 digits + `.png`; reject anything else,
reject separators/`..` as in `resolve_embed`), then delete ONLY from
`app_data_dir()/assets/<file_name>`; missing file is Ok (idempotent). Extract
the validation into a pure `fn is_pasted_image_name(&str) -> bool` and
unit-test it (valid name; traversal attempt; wrong extension; wrong digits).
Register the command. `platform.ts`: `deletePastedImages(names: string[])`
looping the invoke.

**Verify**: `cargo test` (≥3 passing total incl. plan-008 tests); `cargo check`.

### Step 3: Hook into save

In `main.ts` `doSave`, BEFORE `afterSave` resets `loadedText`: compute
`dropped = droppedPastedImages(session.loadedText, session.currentText)`.
Complete the save exactly as today. THEN, if `dropped.length > 0`, show a
Yes/No modal (reuse the plan-004 `uv-modal` pattern):
"Removed image reference(s):\n<names>\nAlso delete these files from the asset
store?" — Yes → `platform.deletePastedImages(dropped)`; No → nothing. Errors
log to console, never block the completed save.

**Verify**: gates green. Manual smoke: paste an image → save → delete the
`![[...]]` line → save → prompt lists the file → Yes → file gone from
`%APPDATA%\com.rifkiadam.unvaulted\assets\`; repeat with No → file stays;
save with no removals → no prompt.

## Done criteria

- [ ] Gates + `cargo test` green
- [ ] Helper tests cover extraction, malformed-name rejection, and diff cases
- [ ] `is_pasted_image_name` unit-tested incl. traversal rejection
- [ ] Manual smoke: Yes-deletes / No-keeps / no-removal-no-prompt all confirmed
- [ ] Save is never blocked or reordered by the prompt (save first, ask after)
- [ ] `git status` clean; output in the report

## STOP conditions

- Plan 010 not DONE/merged.
- Any temptation to widen deletion beyond the strict name pattern + central
  store (report instead).
- The prompt would have to run BEFORE the save completes (don't — data safety
  first).

## Maintenance notes

- If a future feature indexes multiple notes, `droppedPastedImages` is the
  seam to upgrade from per-file to global orphan detection.
- Reviewer should scrutinize: the name-pattern validation on BOTH sides
  (JS extraction + Rust deletion) and the save-before-prompt ordering.

## Review — 2026-07-18

**Verdict: PASS.**

Reviewed `main..feat/011-cleanup` (4 commits, one per step). Independently
verified: gates green (typecheck, **113/113 JS tests**, build, **cargo test
3/3** — `test_is_pasted_image_name` genuinely present and covering
traversal); Step 0 fallback chain exactly as specified (`picture_dir()/
Unvaulted` with `create_dir_all` → `home_dir()/Pictures/Unvaulted` →
legacy `app_data_dir()/assets`), store-first-then-legacy probing in both
`resolve_embed` and `delete_pasted_image`, no file migration; strict name
validation on both sides with tests; `dropped` computed BEFORE the save,
modal strictly AFTER `saveAtomic`+`afterSave` (STOP condition honored);
delete errors log-only, never block a completed save. Scope clean — 5
files, every hunk traced to a step; the confirm modal reuses the
plan-004 `uv-modal` skin.

Non-blocking notes for the record: `is_pasted_image_name` indexes a
`chars` vec (could panic on exotic multibyte names — unreachable via the
ASCII-only JS regex that is its sole caller); the modal copies the
plan-004 inline-style wart (`--bg-color`/`--text-color`) already
neutralized by theme.css's `!important` overrides.

Operator smoke 2026-07-18: all five checks confirmed no-issue (paste →
`Pictures\Unvaulted` auto-created; legacy-store note still renders;
Yes deletes; No keeps; ordinary saves show no prompt).

**Plan 011 complete — merging to `main`. All planned work is done; next
step is the final release build.**