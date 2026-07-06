# Plan 002: Markdown dialect parsing layer (GFM + Obsidian extensions)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 91467ad..HEAD -- src/ tests/ package.json`
> Plan 001 must be DONE (check `plans/README.md`): `src/editor.ts` exists and
> `npm run typecheck && npm test` pass **before you start**. If `src/markdown/`
> already exists, this plan may have been partially executed — STOP and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (pure additive parsing layer; no UI behavior changes yet)
- **Depends on**: plans/001-scaffold-and-verification-baseline.md
- **Category**: feature (parsing core)
- **Planned at**: commit `91467ad`, 2026-07-06

## Why this matters

Unvaulted renders Obsidian-flavored markdown. The flavor = CommonMark + GFM plus
Obsidian-specific syntax. This plan builds the **parsing layer only** — teaching the
CodeMirror/Lezer markdown parser to *recognize* every construct as syntax-tree nodes,
with unit tests over parse trees. The rendering of those nodes (decorations, widgets)
is plan 003; keeping parse and render separate makes the hardest part of the product
testable without a DOM. This module is the deepest in the app: broad behavior behind
a small stable interface.

## Current state

After plan 001:

- `src/editor.ts` exports `createEditor(parent, initialText): EditorView` using
  `basicSetup` — **no markdown support at all yet**.
- `tests/editor.test.ts` exists; `npm test` (Vitest), `npm run typecheck` pass.
- Installed: `codemirror`, `@codemirror/state`, `@codemirror/view`.

Product requirements this plan implements (from `docs/prd/PRD-unvaulted-mvp.md`,
inlined here — treat this list as the spec):

**Tier A — must parse (standard):** headings, bold, italic, strikethrough, inline
code, fenced code blocks (with language info), blockquotes, ordered/unordered lists,
task-list items `- [ ]` / `- [x]`, GFM tables, links `[t](url)`, images `![a](url)`,
horizontal rule `---`.

**Tier A — must parse (Obsidian extensions):**
- Highlight: `==text==` → inline node (name it `Highlight`), with `==` as marks.
- Frontmatter: a block delimited by `---` lines **only at the very start of the
  document**, containing YAML-ish `key: value` lines.

**Tier C — must parse (rendered-but-inert later; still needs nodes now):**
- Wikilink: `[[target]]` and `[[target|alias]]` → inline node `Wikilink`.
- Embed: `![[target]]` → inline node `Embed`.
- Tag: `#word` (letters, digits, `-`, `_`, `/`; must start with a letter; not inside
  a word — `a#b` is NOT a tag; `#1` is NOT a tag) → inline node `Tag`.

**Callouts** (`> [!note] Title` blockquotes) need **no parser extension**: they are
ordinary blockquotes; recognition happens by inspecting the first line's text. This
plan ships a helper `parseCalloutHeader(line: string)` (see Step 4) that plan 003
will call. Do not build a Lezer node for callouts.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install new deps | `npm install @codemirror/lang-markdown @lezer/markdown @codemirror/language @codemirror/language-data @lezer/common` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass |
| Build | `npm run build` | exit 0 |

## Scope

**In scope:**
- `src/markdown/lang.ts` (new) — the assembled markdown language export.
- `src/markdown/extensions.ts` (new) — custom Lezer `MarkdownConfig` extensions
  (Highlight, Wikilink, Embed, Tag, Frontmatter).
- `src/markdown/callout.ts` (new) — `parseCalloutHeader` helper.
- `src/editor.ts` (modify) — add the markdown language to the editor extensions.
- `tests/markdown/*.test.ts` (new).
- `package.json` / lockfile (the named deps only).

**Out of scope (do NOT touch):**
- Any rendering/decoration logic (plan 003). No `Decoration`, no widgets here.
- Theme/CSS (plan 005). File open/save (plan 004). `src-tauri/**`.
- Math, Mermaid, footnotes — explicitly deferred product decisions.

## Interface contract (what later plans rely on)

`src/markdown/lang.ts` exports:

```ts
import { LanguageSupport } from '@codemirror/language';
export function unvaultedMarkdown(): LanguageSupport;
```

Built with `markdown()` from `@codemirror/lang-markdown` configured with:
- `base: markdownLanguage` (which already includes GFM: tables, task lists,
  strikethrough, autolink),
- `codeLanguages: languages` from `@codemirror/language-data` (lazy-loaded
  highlighting inside fenced code blocks),
- `extensions: [highlight, wikilink, embed, tag, frontmatter]` from
  `./extensions.ts`.

`src/markdown/extensions.ts` exports the five `MarkdownConfig` objects with these
**exact node names** (plan 003 matches on them): `Highlight`, `HighlightMark`,
`Wikilink`, `Embed`, `Tag`, `Frontmatter`.

`src/markdown/callout.ts` exports:

```ts
export interface CalloutHeader { type: string; title: string; }
// '> [!note] My title' body line (WITHOUT the '> ' prefix) → { type: 'note', title: 'My title' }
// returns null when the line is not a callout header
export function parseCalloutHeader(firstLineText: string): CalloutHeader | null;
```

## Steps

### Step 1: Install dependencies, wire base GFM

Install the deps from the commands table. In `src/markdown/lang.ts`, assemble
`unvaultedMarkdown()` with base `markdownLanguage` + `codeLanguages: languages`
(no custom extensions yet). In `src/editor.ts`, add `unvaultedMarkdown()` to the
extension list.

**Verify**: `npm run typecheck && npm run build` → exit 0.

### Step 2: Parse-tree test harness + GFM baseline tests

Create `tests/markdown/harness.ts`:

```ts
import { unvaultedMarkdown } from '../../src/markdown/lang';
// Build an EditorState with the language, return a compact list of
// { name, from, to, text } for every syntax node, via syntaxTree(state).iterate()
export function parseNodes(doc: string): Array<{ name: string; text: string }>;
```

Note: `syntaxTree` comes from `@codemirror/language`; force full parsing of small
docs with `ensureSyntaxTree(state, doc.length, 5000)`.

`tests/markdown/gfm.test.ts` — assert node presence for each Tier A construct:
`# h` → `ATXHeading1`; `**b**` → `StrongEmphasis`; `*i*` → `Emphasis`;
`~~s~~` → `Strikethrough`; `` `c` `` → `InlineCode`; ```` ```js ```` fence →
`FencedCode` + `CodeInfo`; `> q` → `Blockquote`; `- x` → `BulletList`;
`1. x` → `OrderedList`; `- [ ] t` → `TaskMarker`; a 2-row pipe table → `Table`;
`[t](u)` → `Link`; `![a](u)` → `Image`; `---` after a blank line → `HorizontalRule`.

(If an assertion fails because the actual Lezer node name differs from the name
listed here, print the node dump for that input, use the actual name in the test,
and record the correction in your report NOTES — these baseline names come from
`@lezer/markdown` and are stable, but verify against reality, not this plan.)

**Verify**: `npm test` → all pass.

### Step 3: Custom inline extensions (Highlight, Wikilink, Embed, Tag)

In `src/markdown/extensions.ts`, implement four `MarkdownConfig`s using
`defineNodes` + `parseInline`. Follow the structure of the `Strikethrough`
extension in the `@lezer/markdown` source (it is the canonical example of a
paired-delimiter inline extension; find it in
`node_modules/@lezer/markdown/dist/` or the package README).

Behavior spec (test each case):

| Input | Nodes |
|---|---|
| `==hi==` | `Highlight` wrapping two `HighlightMark` (`==`) |
| `==unclosed` | no `Highlight` |
| `[[Note name]]` | `Wikilink` |
| `[[Note\|alias]]` | `Wikilink` (alias form) |
| `[[]]` | no `Wikilink` (empty target) |
| `![[Note]]` | `Embed` (must win over `Image`-ish interpretation) |
| `#project/sub-1` | `Tag` |
| `a#b`, `#1`, `# heading` | no `Tag` (mid-word / digit start / heading) |

Wire all four into `unvaultedMarkdown()`'s `extensions` array.

**Verify**: `npm test` → all pass, including new `tests/markdown/obsidian.test.ts` cases above.

### Step 4: Frontmatter block extension + callout helper

- Frontmatter: a `MarkdownConfig` with `defineNodes: ['Frontmatter']` and a
  `parseBlock` entry that matches **only when the document starts at offset 0 with
  a `---` line**, consumes lines until the closing `---`, and emits one
  `Frontmatter` node spanning the whole block. Documents whose first line is not
  `---` are unaffected; a `---` later in the doc must still parse as
  `HorizontalRule` (test both).
- `src/markdown/callout.ts`: implement `parseCalloutHeader` per the interface
  contract. Accepted types: any `[!word]` (letters only, case-insensitive,
  normalize to lowercase). Title = trimmed remainder; empty title allowed.
  Test cases: `[!note] Hello` → `{type:'note', title:'Hello'}`;
  `[!WARNING]` → `{type:'warning', title:''}`; `[note] x` → null; `plain` → null.

**Verify**: `npm test` → all pass. `npm run typecheck && npm run build` → exit 0.

### Step 5: Corpus smoke test

`tests/markdown/corpus.test.ts`: one realistic Obsidian-style document (inline it
in the test as a template string: frontmatter with 4 keys incl. a `related` list of
wikilinks, an H1, a callout, a table, a task list, code fence, `==highlight==`,
tags) — assert the full node inventory contains `Frontmatter`, `Wikilink` (≥2),
`Tag`, `Highlight`, `Table`, `TaskMarker`, `FencedCode`, and that parsing takes
< 200 ms.

**Verify**: `npm test` → all pass.

## Test plan

Covered in steps: `tests/markdown/harness.ts`, `gfm.test.ts`, `obsidian.test.ts`,
`frontmatter.test.ts` (or fold into obsidian), `callout.test.ts`, `corpus.test.ts`.
All pure Node tests — no DOM, no Tauri. Model precision over volume: every row in
the behavior-spec tables above is one test case.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; new tests cover every row of both behavior-spec tables
- [ ] `npm run build` exits 0
- [ ] `grep -rn "Decoration" src/markdown/` returns no matches (parse layer stays render-free)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 is not DONE (no `src/editor.ts`, or baseline commands fail before you start).
- The installed `@lezer/markdown` version's `MarkdownConfig`/`parseInline` API does
  not match the shape this plan assumes (report the actual exported API).
- `![[...]]` cannot be made to take precedence over the base `Image` parsing after
  a reasonable attempt (report what the tree produces instead).
- Any GFM baseline node (Table, TaskMarker, Strikethrough) is absent from the base
  `markdownLanguage` — that would mean a wrong package/base was wired.

## Maintenance notes

- Plan 003 consumes the node names — renaming any node is a breaking change across
  plans; don't.
- The tag regex intentionally rejects digit-leading tags to match Obsidian; if that
  ever changes, `obsidian.test.ts` documents the contract to update.
- Reviewer should scrutinize: that extensions live purely in the Lezer layer (no
  editor/view imports in `src/markdown/` except `lang.ts`'s `LanguageSupport`).
