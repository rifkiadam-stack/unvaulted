# PRD: Unvaulted MVP — standalone Obsidian-like markdown editor

## Problem Statement

Obsidian is an excellent markdown editor — its live-preview writing experience, visual
styling, and markdown dialect are exactly what the user wants. But Obsidian has one
structural limitation the user cannot work around: **it cannot open a single `.md` file
standalone**. Everything must live inside a vault-based workspace. When the user just
wants to double-click one markdown file and read or edit it — the way Notepad opens a
`.txt` — Obsidian forces vault ceremony, workspace context, and a heavyweight app
launch that makes no sense for that job.

Plain-text editors (Notepad, VS Code without extensions) open single files instantly
but render markdown as raw source. Nothing on the user's system combines *instant,
single-file, zero-workspace opening* with *Obsidian-quality rendered writing*.

## Solution

**Unvaulted**: a Windows desktop app that opens one `.md` file per window, instantly,
with zero workspace concept — but renders and edits it exactly like Obsidian's live
preview.

The product thesis, in the user's own words: *"conceptually it is very much Notepad;
only the writing experience inside is very much Obsidian."*

The success criterion for the UX: an Obsidian user who opens a file in Unvaulted should
immediately feel *"oh, this is Obsidian — just the Notepad version."* Familiarity at
first sight, with none of the vault machinery.

App behavior is Notepad-like: one file per window, manual save (Ctrl+S), a dirty
indicator in the title bar, near-zero UI chrome, and instant startup. Content rendering
is Obsidian-like: live preview (formatting renders as you type; syntax markers appear
near the cursor), the default Obsidian visual theme in dark and light, and graceful
handling of Obsidian-specific syntax — including rendering vault-dependent constructs
(wikilinks, embeds, tags) beautifully but inert, since there is no vault to resolve
them against.

## User Stories

### Opening files

1. As a Windows user, I want to double-click a `.md` file in Explorer and have it open
   in Unvaulted, so that opening a note is as effortless as opening a text file.
2. As a Windows user, I want Unvaulted to appear in the "Open with" menu for `.md`
   files after installation, so that I can choose it per-file without it hijacking my
   default handler.
3. As a user, I want the app to start near-instantly, so that opening a note never
   feels heavier than opening Notepad.
4. As a user, I want to drag a `.md` file from Explorer onto an Unvaulted window and
   have it open there, so that I have a quick mouse-driven way to open files.
5. As a user, I want to press Ctrl+O to get a native file-open dialog, so that I can
   open a file from within the app.
6. As a user launching Unvaulted with no file (e.g. from the Start menu), I want a
   minimal empty state that hints "Ctrl+O or drop a file here", so that I know how to
   proceed without a manual.
7. As a user, I want each file I open to appear in its own independent window, so that
   opening three files gives me three windows I can arrange freely — like Notepad, not
   like a tabbed workspace.

### Reading & rendering (the Obsidian look)

8. As an Obsidian user, I want headings, bold, italic, strikethrough, lists, and
   blockquotes to render with Obsidian's default visual styling, so that my notes look
   the way I am used to.
9. As a user, I want `---` on its own line to render as a horizontal rule, so that my
   section separators look right.
10. As a user, I want task lists (`- [ ]` / `- [x]`) to render as real checkboxes that
    I can toggle by clicking, so that my todo notes stay interactive.
11. As a user, I want GFM tables to render as formatted tables, so that structured
    notes remain readable.
12. As a user, I want fenced code blocks to render with syntax highlighting, so that
    code snippets in my notes are legible.
13. As a user, I want inline code, links, and images (with paths resolved relative to
    the file's own folder) to render as they do in Obsidian, so that a note authored
    in Obsidian looks identical here.
14. As an Obsidian user, I want YAML frontmatter to render as a read-only Properties
    block at the top of the note (not as raw `---` fences), so that my notes with
    metadata look like they do in Obsidian.
15. As an Obsidian user, I want callouts (`> [!note]`, `> [!warning]`, etc.) to render
    as styled callout boxes, so that my highlighted notes keep their visual structure.
16. As an Obsidian user, I want `==highlighted text==` to render with the yellow
    highlight, so that my emphasis marks carry over.
17. As an Obsidian user, I want `[[wikilinks]]` and `![[embeds]]` to render styled
    like links — not as raw bracket syntax — but be inert (non-clickable, since there
    is no vault), so that vault-authored notes still *look* right instead of exposing
    raw syntax.
18. As an Obsidian user, I want `#tags` to render as tag pills but be non-clickable,
    so that tagged notes keep their appearance without pretending a tag search exists.

### Editing (live preview)

19. As a writer, I want formatting to render live as I type (typing `**bold**` shows
    bold immediately), so that writing feels like Obsidian's live preview, not raw
    source editing.
20. As a writer, I want the markdown syntax markers to reveal themselves when my
    cursor is on or near a formatted span, so that I can edit the underlying syntax
    exactly as I do in Obsidian.
21. As a writer, I want standard editing operations — cut/copy/paste/undo/redo, via
    keyboard and a right-click context menu — so that basic editing needs no toolbar.
22. As a reader, I want Ctrl+F to open find-in-file, so that I can locate text in a
    long note quickly.

### Saving (Notepad semantics)

23. As a user, I want my edits to stay in memory until I explicitly press Ctrl+S, so
    that merely opening and poking at a file never silently modifies it on disk.
24. As a user, I want an unsaved-changes indicator (`*` next to the filename in the
    title bar), so that I always know whether the file on disk matches what I see.
25. As a user, I want a confirmation dialog when I close a window with unsaved changes
    (save / discard / cancel), so that I cannot lose work by accident.
26. As a user, I want saves to be atomic (never a half-written file, even on crash or
    power loss mid-save), so that my notes are never corrupted.

### Appearance

27. As a user, I want the app to follow my OS dark/light preference automatically with
    an Obsidian-default look in both, so that it feels native without any settings.
28. As a user, I want zero configuration surface — no settings screen, no theme picker,
    no options — so that the app stays as simple as its Notepad concept promises.

### Title bar & window

29. As a user, I want the window title to read `filename.md — Unvaulted` (with `*` when
    dirty), so that the taskbar tells me which note each window holds.
30. As a user, I want Ctrl+W to close the window (with the same unsaved-changes guard),
    so that keyboard-driven workflows stay fast.

## Implementation Decisions

Decisions locked during the design interview (grill-me session):

- **Platform: Tauri** (Rust shell + system WebView2). Chosen over Electron specifically
  for instant startup and small binary — the "as light as Notepad" requirement is a
  hard constraint. The UI runs in the webview as a web app.
- **Frontend: vanilla TypeScript + Vite + CodeMirror 6.** No UI framework (no
  React/Svelte). The entire UI is one editor surface plus an empty state; CodeMirror 6
  provides its own state/view system, and a simple stack minimizes execution risk for
  the implementing agent.
- **Single mode: Live Preview.** No separate reading view and no raw source mode in
  the MVP. CodeMirror 6 decorations implement the Obsidian-style behavior: rendered
  formatting everywhere, syntax markers revealed near the cursor.
- **Markdown dialect is tiered:**
  - *Tier A (in MVP)*: CommonMark + GFM (headings, emphasis, strikethrough, lists,
    task lists with clickable checkboxes, tables, fenced code with syntax highlighting,
    blockquotes, links, images, `---` horizontal rules) plus Obsidian extensions:
    frontmatter rendered as a read-only Properties block, callouts, `==highlight==`.
  - *Tier B (explicitly deferred)*: math (KaTeX), Mermaid diagrams, footnotes.
  - *Tier C (rendered but inert by design)*: `[[wikilinks]]`, `![[embeds]]`, `#tags` —
    styled to look correct (link-styled text, tag pills) but non-functional, because
    the product has no vault. Raw bracket syntax must never be visible in preview.
- **Save semantics: manual** (Ctrl+S), a deliberate deviation from Obsidian's
  autosave. Dirty indicator in the title, confirm-on-close, atomic write
  (write-temp-then-rename).
- **Window model: one file per window, no tabs.** Each open file is an independent
  window; no shared workspace state.
- **UI chrome: near zero.** Native title bar only. No menu bar, toolbar, sidebar, or
  status bar. All interactions via keyboard shortcuts (Ctrl+S/O/F/W), drag-drop, and
  the editor's right-click context menu.
- **Theme: replicate Obsidian's default theme**, dark and light, switching
  automatically with the OS preference. No customization.
- **Distribution: Windows-only MVP.** NSIS installer produced by the Tauri bundler;
  registers Unvaulted as an "Open with" handler for `.md` without forcing it as the
  default; bootstraps WebView2 if absent.

### Module architecture

Six modules, designed so the deep ones are testable in isolation:

1. **markdown-extensions** — the parsing layer for the Obsidian dialect on top of GFM:
   callout recognition, `==highlight==`, wikilink/embed/tag syntax detection,
   frontmatter extraction. Pure text-to-structure; no DOM, no editor dependency. The
   deepest module.
2. **live-preview** — the CodeMirror 6 decoration engine: what renders as a widget,
   what hides, and when syntax reveals near the cursor; checkbox toggling; Properties
   block widget; callout widgets.
3. **file-session** — open/save/dirty-state semantics as pure logic: load, track
   modifications, derive the window title, decide when a close needs confirmation,
   atomic-save orchestration. Abstracted from Tauri APIs behind a small interface so
   it is testable without the runtime.
4. **theme** — the Obsidian-default visual replication (dark + light) and OS
   preference following.
5. **app-shell** — the thin Tauri/Rust integration layer: window-per-file lifecycle,
   receiving a file path from the CLI/file association, native dialogs (open,
   confirm-close), atomic file write, drag-drop plumbing.
6. **packaging** — NSIS installer configuration and `.md` file-association
   registration.

## Testing Decisions

- A good test asserts **external behavior, not implementation details**: "given this
  markdown text, the parse identifies a callout of type `note` spanning these lines" —
  never "function X calls function Y".
- **All six modules get tests**, with the test style matched to each module's nature:
  - *markdown-extensions*: pure unit tests — markdown string in, expected structure
    out. Broadest case coverage lives here (every Tier A construct, Tier C detection,
    edge cases like unclosed syntax and nested constructs).
  - *live-preview*: headless CodeMirror 6 state tests — given a document and a cursor
    position, assert which decorations are active (rendered vs. revealed syntax),
    and that checkbox toggles produce the correct document edit.
  - *file-session*: unit tests against the abstracted interface — dirty-flag
    transitions, title derivation, close-confirmation decisions, save-flow ordering
    (including simulated failure mid-save leaving the original intact).
  - *theme*: automated sanity checks that both theme variants define the required
    style tokens and that OS-preference switching selects the right variant; visual
    fidelity itself is verified by human review against Obsidian.
  - *app-shell*: integration smoke tests — launch with a file argument opens a window
    with that file loaded; save round-trips content to disk correctly.
  - *packaging*: a scripted/manual verification checklist — installer registers the
    "Open with" entry, double-click opens the app, uninstall cleans up.
- There is no prior test art in this repository (greenfield); the executor establishes
  the test harness as part of the first implementation plan, and that harness becomes
  the verification baseline every later plan runs against.

## Out of Scope

- **Everything vault-shaped**: multi-file awareness, backlinks, graph view, tag
  search, quick switcher, file explorer sidebar, link resolution/navigation.
- **Tier B markdown**: math (KaTeX), Mermaid, footnotes — deferred, not rejected.
- **Reading view and raw source mode** as separate modes.
- **Tabs** or any multi-document window model.
- **Autosave** — rejected by design (manual save is a product decision).
- **Settings/preferences UI, theme customization, custom CSS.**
- **macOS and Linux builds** — the architecture (Tauri) keeps the door open, but MVP
  is Windows-only.
- **Structured frontmatter editing** — the Properties block is read-only in MVP. When
  the cursor enters it, it reveals the raw YAML for text editing (consistent with the
  live-preview reveal principle); structured property *widgets* (date pickers, tag
  editors) are out of scope.
- **Publishing this PRD as a GitHub issue** — the user chose file-only.

## Further Notes

- The user's own notes (an Obsidian wiki) are the primary test corpus: they are dense
  with frontmatter properties, wikilinks in `related` fields, tags, and callouts —
  exactly the constructs that must render beautifully-but-inert. A note from that wiki
  opened in Unvaulted looking "like Obsidian" is the realest acceptance test.
- Execution follows the repository's two-agent pipeline: this PRD feeds `improve plan`
  (Claude, orchestrator) which produces self-contained plans in `plans/`; a Gemini
  agent in Google Antigravity executes them with one logical commit per step;
  `review-external` verifies each delivery against its plan before anything merges.
- Performance guardrail worth carrying into plans: cold start to a rendered document
  should feel Notepad-instant; if a heavy dependency threatens that, the dependency
  loses.
