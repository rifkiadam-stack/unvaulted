# Plan 001: Scaffold the Tauri + Vite + CodeMirror app and establish the verification baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 91467ad..HEAD -- src/ src-tauri/ package.json`
> If any of those paths already contain code, this plan may have been partially
> executed — compare against the steps below before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx (verification baseline) + scaffold
- **Planned at**: commit `91467ad`, 2026-07-06

## Why this matters

Unvaulted is a greenfield product: a Windows desktop app that opens a single `.md`
file per window — "conceptually Notepad, but the writing surface inside is Obsidian."
Nothing exists yet: no package.json, no build, no tests. Every later plan needs a
working skeleton and, critically, a **one-command verification baseline** (typecheck,
test, build) that all subsequent plans use as their done-criteria gates. This plan
creates the smallest honest skeleton: a Tauri v2 window showing a CodeMirror 6
editor, with test/typecheck/build all green.

## Current state

- Repo root: `c:\repos\unvaulted` (git repo, default branch `main`).
- `src/`, `tests/`, `public/` exist and are **empty** directories.
- No `package.json`, no `src-tauri/`, no CI.
- Product requirements live in `docs/prd/PRD-unvaulted-mvp.md` (read it for
  background; every requirement this plan needs is inlined below).
- `CLAUDE.md` at the root contains coding principles (simplicity first, surgical
  changes); match its spirit: minimum code that solves the problem.

Key product constraints that shape the scaffold:

- **Stack (locked decisions)**: Tauri v2 (Rust shell + WebView2), frontend in
  **vanilla TypeScript** (NO React/Svelte/Vue), Vite build, CodeMirror 6 editor,
  Vitest for tests, npm as package manager.
- **Instant startup** is a hard product constraint — keep dependencies minimal;
  do not add libraries this plan doesn't name.
- One file per window; no tabs; near-zero UI chrome. The scaffold shows a full-window
  editor and nothing else.

## Prerequisites (verify before Step 1)

| Check | Command | Expected |
|-------|---------|----------|
| Node.js ≥ 20 | `node --version` | v20.x or later |
| npm | `npm --version` | any recent |
| Rust toolchain | `rustc --version` && `cargo --version` | any stable ≥ 1.77 |
| WebView2 (Windows 10/11) | present by default with Edge | — |

If Node or Rust is missing: **STOP and report** — do not install system toolchains
without the operator's involvement.

## Commands you will need (after Step 1 creates them)

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `npm install` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0, no errors |
| Unit tests | `npm test` | all pass |
| Frontend build | `npm run build` | exit 0, `dist/` produced |
| Dev app (manual smoke) | `npm run tauri dev` | window opens with editor |

## Scope

**In scope** (files you create/modify):
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
- `index.html`, `src/main.ts`, `src/editor.ts`
- `src-tauri/**` (Tauri v2 scaffold: `Cargo.toml`, `tauri.conf.json`, `src/main.rs`, `src/lib.rs`, capabilities, icons)
- `tests/editor.test.ts`

**Out of scope** (do NOT touch):
- `skills/`, `hooks/`, `.claude-plugin/`, `.agents/`, `.claude/`, `docs/`, `plans/`
  (except your status row in `plans/README.md`), `CLAUDE.md`, `GEMINI.md`, `README.md`, `LICENSE`.
- No markdown-specific features (parsing extensions, live preview, themes, file
  open/save) — those are later plans (002–005). The scaffold editor is a plain
  CodeMirror instance with placeholder text.

## Git workflow

- Branch: `feat/001-scaffold` off `main`.
- **One logical commit per step below**, message prefix `001: <step title>`.
- Do NOT push or open a PR; the orchestrator reviews locally.

## Steps

### Step 1: Initialize npm project + Vite + TypeScript

Create `package.json` via `npm init -y`, then install dev deps:

```
npm install -D vite typescript vitest @tauri-apps/cli
npm install @codemirror/state @codemirror/view codemirror @tauri-apps/api
```

Create `tsconfig.json` (strict mode on: `"strict": true`, `"target": "ES2022"`,
`"module": "ESNext"`, `"moduleResolution": "bundler"`, include `src` and `tests`).

Create `vite.config.ts` (defaults are fine; `clearScreen: false` and
`server.port: 1420` + `server.strictPort: true` to match Tauri expectations).

Add npm scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "tauri": "tauri"
}
```

Create `.gitignore` with at least: `node_modules/`, `dist/`, `src-tauri/target/`.

**Verify**: `npm run typecheck` → exit 0 (no source yet is fine, add empty `src/main.ts` first).

### Step 2: Minimal editor module + entry point

- `index.html`: single `<div id="app"></div>`, loads `/src/main.ts`, no other UI.
  `<title>Unvaulted</title>`. Body margin 0; `#app` fills the viewport (100vh).
- `src/editor.ts`: export a function `createEditor(parent: HTMLElement, initialText: string): EditorView`
  that builds a CodeMirror 6 `EditorView` with `basicSetup` (from the `codemirror`
  package) and the initial text. **No markdown extensions yet.**
- `src/main.ts`: mount `createEditor(document.querySelector('#app')!, '')`.

**Verify**: `npm run build` → exit 0, `dist/` exists.

### Step 3: Vitest baseline test

`tests/editor.test.ts` — headless test, no browser: construct an
`EditorState` (from `@codemirror/state`) with doc `"hello"`, assert
`state.doc.toString() === "hello"`. Also test that `createEditor` is importable
(import it; assert it is a function). Keep jsdom out unless required — if
`createEditor`'s import chain pulls `@codemirror/view` DOM code that fails under
Node, set Vitest `environment: 'jsdom'` in `vite.config.ts` test section and add
`npm install -D jsdom`.

**Verify**: `npm test` → 2 tests pass, exit 0.

### Step 4: Tauri v2 scaffold

Run `npx tauri init` (answers: app name `Unvaulted`, window title `Unvaulted`,
frontend dist `../dist`, dev server URL `http://localhost:1420`,
dev command `npm run dev`, build command `npm run build`).

Then in `src-tauri/tauri.conf.json`:
- `productName`: `Unvaulted`; `identifier`: `com.rifkiadam.unvaulted`.
- Single main window, default size ~900×700, `title`: `Unvaulted`.

Keep the generated Rust code as-is (default `main.rs`/`lib.rs`); no custom commands
in this plan.

**Verify**:
1. `npm run typecheck && npm test && npm run build` → all exit 0.
2. `cargo check` inside `src-tauri/` → exit 0 (compiles without building installer).

### Step 5: Manual smoke (report result, do not skip)

Run `npm run tauri dev` — a desktop window titled "Unvaulted" opens showing an
empty editable CodeMirror editor filling the window. Type text; it appears. Close
the window; the process exits.

**Verify**: describe observed behavior in your report (window opened y/n, typing works y/n).

## Test plan

- `tests/editor.test.ts` as in Step 3 (state round-trip + export shape).
- The real deliverable is the **verification baseline**: `npm run typecheck`,
  `npm test`, `npm run build`, `cargo check` all green — every later plan (002–006)
  uses these as gates.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0 (≥2 tests, all pass)
- [ ] `npm run build` exits 0 and produces `dist/`
- [ ] `cargo check` in `src-tauri/` exits 0
- [ ] `npm run tauri dev` opens an editable editor window (manual, reported)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Node or Rust toolchain is missing or older than the prerequisites table.
- `npx tauri init` produces a config schema incompatible with the keys named in
  Step 4 (Tauri major-version drift) — report the generated schema instead of guessing.
- Any dependency fails to install on Windows (native build failures).
- The Vitest test cannot run without pulling in more than the `jsdom` fallback
  named in Step 3.

## Maintenance notes

- Plans 002–005 build directly on `src/editor.ts` — keep its exported signature
  (`createEditor(parent, initialText): EditorView`) stable; later plans extend the
  extension list it passes to the view.
- Plan 006 consumes the Tauri bundler config; nothing in this plan should pin
  bundler targets yet.
- Reviewer should scrutinize: dependency list minimalism (nothing beyond the named
  packages) and that strict TypeScript is actually on.
