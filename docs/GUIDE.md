---
type: guide
title: Unvaulted User Guide
created: 2026-07-18
tags:
  - unvaulted
  - guide
---

Welcome to **Unvaulted** — open this file *in Unvaulted* and every example below renders live, exactly as it will for you.

> [!tip] How to use this guide
> Raw syntax is written inside `code like this` so it doesn't render. The surrounding lines are the result. Put your cursor on any line to peek at its raw syntax — move away, and it turns pretty again.

## What is Unvaulted?

Conceptually, Unvaulted is **Notepad**: one file, one window, open-write-save, no vault, no clutter. But the *writing feel* is **Obsidian**: what you type renders beautifully in place (live preview).

## Basics

| Action | How |
|--------|-----|
| New window | `Ctrl+N`, or **File → New** |
| Open a file | Double-click a `.md`/`.txt` (pick Unvaulted in *Open with*), or `Ctrl+O`, or drag a file onto the window |
| Save | `Ctrl+S` — unsaved changes show a `*` in the title bar |
| Save As | `Ctrl+Shift+S` (`.md`, `.txt`, or anything) |
| Find in file | `Ctrl+F` |
| Close window | `Ctrl+W` — you'll be asked first if there are unsaved changes |
| Switch theme | Click the ☀ / 🌙 icon in the top-right corner (dark is the default) |

The small **File** menu (top-left) holds New / Open / Save / Save As. **Right-click** anywhere in the editor for a context menu: formatting commands in markdown mode, plus Cut / Copy / Paste / Select All / Undo / Redo everywhere.

The big title on the very first line is the **file name** — it can't be edited from inside; rename the file itself (F2 in Explorer) to change it.

## Writing Syntax

### Headings

Type `#` through `######` followed by a space at the start of a line:

# Heading 1
## Heading 2
### Heading 3

### Text styles

- `**bold**` → **bold** — or select text and press `Ctrl+B`
- `*italic*` → *italic* — or `Ctrl+I`
- `~~strikethrough~~` → ~~strikethrough~~ — or `Ctrl+Shift+X`
- `==highlight==` → ==highlight== — or `Ctrl+Shift+H`
- `` `inline code` `` → `inline code`

All four also live in the right-click menu; press the same shortcut again to un-format.

### Horizontal rule

Type `---` on an empty line (not the first line of the file!) → becomes a horizontal rule:

---

### Lists

Type `- ` for bullets, `1. ` for numbered, `- [ ] ` for checklists:

- a bullet item
- another one

1. first step
2. second step

- [ ] an open task — **click the checkbox** to toggle it!
- [x] a done task

### Quotes & Callouts

Type `> ` at the start of a line for a quote:

> This is a plain quote.

Type `> [!note]` (or `tip`, `info`, `warning`, `danger`, `question`, `success`, `quote`) for an Obsidian-style callout:

> [!note] A note title
> Callout body on the next line, still prefixed with `> `.

> [!warning] Careful
> The orange callout for warnings.

### Tables

Type cell rows separated by `|`, with a `|---|---|` row under the header:

| Column A | Column B |
|----------|----------|
| content  | content  |

### Code blocks

Wrap with three backticks (```` ``` ````); name the language for syntax highlighting:

```js
function hello() {
  console.log("Unvaulted!");
}
```

### Links

`[text](https://example.com)` → [an example link](https://example.com) — clickable, opens in your browser.

## Properties (file metadata)

Type `---` on the **first line** of a file → a Properties block is created automatically and shows as a card (see the card at the very top of this file!).

- **+ Add property** → pick a suggestion (`trigger`, `tags`, `created`, `updated`, `type`, `title`, `sources`) **or type any name** and press Enter.
- **Click a value** to edit it → `Enter` saves, `Esc` cancels.
- `tags` and `sources` are **lists**: separate items with commas (`learning, git, important`) → stored as YAML list lines, shown as chips.
- `created` / `updated` auto-fill with today's date (`YYYY-MM-DD`) when added.
- The `×` button at the row's right edge (appears on hover) removes that property.
- Complex/nested values are shown as-is (read-only) and **will never be destroyed**.
- Want the raw YAML? Put your cursor inside the block — the card turns into raw text.

## Images

- **Paste from clipboard** (`Ctrl+V` with an image) → the image is saved automatically to the central `Pictures\Unvaulted` folder, and `![[Pasted image ...]]` is written into your note.
- **Obsidian-style embeds** `![[my-image.png]]` → rendered directly. Unvaulted searches: the note's folder → an `attachments` subfolder → parent folders (up to 5 levels) → the attachment folder from your Obsidian vault config (if the note lives in a vault) → Unvaulted's central folder.
- If you **delete** a `![[Pasted image ...]]` reference and save, Unvaulted offers to delete the image file too — no orphan files piling up. Choose *No* if another file still uses it.
- Standard `![alt](path-or-url)` images work too.

## Plain Text and Other Formats

Unvaulted picks one of two modes automatically, from the file extension:

- **`.md` / `.markdown`** → full markdown mode: everything in this guide is active.
- **Any other extension** (`.txt`, `.json`, `.csv`, `.log`, …) → **plain mode, Notepad-style**: text shows exactly as-is — `---` stays three dashes, `**` stays two asterisks, and there's no Properties card. Your file's content is never transformed.

The Open dialog (`Ctrl+O`) shows all supported files at once (`.md`, `.markdown`, `.txt`); pick "All Files" to open other text formats — or just drag the file onto the window. Unvaulted also appears under right-click → *Open with* for common text formats, without ever taking over your default app.

## Deliberately "Dead"

Unvaulted is for **standalone** files — no vault. So syntax that needs a vault still renders *pretty*, but does nothing:

- `[[wikilink]]` → shows as [[an example wikilink]] styled like a link, but not clickable.
- `#tag` → shows as a #sample-tag pill, not clickable.
- `![[non-image embeds]]` (e.g. embedding another note) → shows as a pill, never loaded.

This is intentional: your Obsidian notes still *look* right, without the app pretending it has vault features.

> [!success] That's it!
> The rest is just writing. Save this file and open it anytime you need a cheat sheet.
