<div align="center">

# Unvaulted

## ***Just open the file.***

An Obsidian-style markdown editor for standalone files — no vault required.

![Windows](https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-blue) ![Version](https://img.shields.io/badge/version-0.1.0-purple)

</div>

---

**Conceptually it's Notepad; the writing surface inside is pure Obsidian.** Open one file, write, save — no vault, no workspace, no sidebar. But the moment you type `**bold**` or `> [!note]`, everything renders live, just like Obsidian.

A lightweight Windows app (±2.7 MB installer) built with Tauri + CodeMirror 6.

## Download & Install

No need to clone the repo — grab the installer directly:

1. Download **[`installer/Unvaulted_0.1.0_x64-setup.exe`](installer/)**
2. Run it. Windows SmartScreen will warn *"Windows protected your PC"* (the installer isn't code-signed) → click **More info → Run anyway**
3. Pick an install mode:
   - **Anyone who uses this computer** → installs to `C:\Program Files\Unvaulted` (one UAC click)
   - **Only for me** → installs to your user profile, **no admin needed at all** (works on locked-down office laptops)

> Requires WebView2 (built into modern Windows 10/11); the installer downloads it automatically if missing.

## Supported File Types

| Format | Treatment |
|--------|-----------|
| `.md`, `.markdown` | **Full markdown mode** — Obsidian-style live preview |
| `.txt` | **Plain mode, Notepad-style** — text shows exactly as-is |
| `.json`, `.csv`, `.log`, `.xml`, `.yml`, `.yaml`, `.ini` | Plain mode too — Unvaulted registers in *Open with* for all of them |
| Any other text file | Open via the Open dialog ("All Files") or drag-drop onto the window |

The mode is picked automatically from the extension: only `.md`/`.markdown` get markdown rendering — everything else is guaranteed to display literally, and **your file's content is never transformed**.

### File-association etiquette (important)

The installer **never hijacks your default apps**. Unvaulted only registers itself as an *option* under right-click → **Open with**. Double-clicking a `.txt` still opens Notepad, a `.json` still opens your editor — until you decide otherwise.

**To make Unvaulted the default** for any format (`.md`, or even `.json`):

> Right-click the file → **Open with** → **Choose another app** → pick **Unvaulted** → check **"Always use this app"**

Once per extension, and it sticks.

## Features

**Writing (markdown mode):**
- Live in-place preview: headings, **bold**/*italic*/~~strikethrough~~, `==highlight==`, inline code & code blocks (with syntax highlighting), tables, blockquotes, `---` rules
- Obsidian-style callouts: `> [!note]`, `[!tip]`, `[!warning]`, `[!danger]`, and more
- `- [ ]` checklists that are **clickable** right in the preview
- **Interactive Properties**: type `---` on the first line → a metadata card appears; click a value to edit, add properties from suggestions or type any key, dates auto-fill; complex values are preserved untouched
- **Images**: paste from clipboard (stored neatly in `Pictures\Unvaulted`), Obsidian-style `![[image.png]]` embeds render (including lookups into your Obsidian vault's attachment folder); delete a reference → on save you're offered to delete the file too
- `[[wikilinks]]` and `#tags` render beautifully but are deliberately **inert** — your Obsidian notes still *look* right without pretending there's a vault

**App behavior:**
- One file = one window; open 3 files = 3 independent windows
- Manual save `Ctrl+S` (atomic write) with a `*` dirty marker + confirmation when closing unsaved changes
- Dark & light themes (☀/🌙 toggle, dark by default), modeled on Obsidian's default theme
- Near-zero chrome: no menu bar, no toolbar, no sidebar
- `Ctrl+O` open, `Ctrl+F` find, `Ctrl+W` close, drag-drop files onto the window

📖 **Full guide + live demo**: [`docs/GUIDE.md`](docs/GUIDE.md) — open that file *in Unvaulted* and every example renders live.

## Reporting Bugs

Open an issue on this repo — screenshots and a sample file help a lot.

## Building from Source

Prerequisites: [Node.js](https://nodejs.org) LTS, [Rust](https://rustup.rs), and the [Tauri v2 Windows prerequisites](https://v2.tauri.app/start/prerequisites/) (MSVC Build Tools + WebView2).

```bash
npm install
npm run tauri dev      # run in development mode
npm run tauri build    # produce the NSIS installer in src-tauri/target/release/bundle/nsis/
```

Verification gates:

```bash
npm run typecheck && npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

**Stack**: Tauri v2 (Rust) · vanilla TypeScript + Vite · CodeMirror 6 (Lezer) · no UI framework.

## About This Repo

This project was built with a two-agent pipeline: Claude as orchestrator (planning + review) and Gemini as code executor. The full development history lives as self-contained plans in [`plans/`](plans/) — 13 plans from scaffold to release, each with machine-checkable done criteria and review notes.
