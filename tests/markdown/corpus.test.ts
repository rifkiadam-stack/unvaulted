import { describe, it, expect } from "vitest";
import { parseNodes } from "./harness";

const CORPUS = `---
title: My Obsidian Note
date: 2026-07-07
tags:
  - testing
related:
  - [[Plan 002]]
  - [[Architecture|System Design]]
---

# My Obsidian Note

> [!info] Project Status
> This is a callout in the project.

Here is a paragraph with some ==highlighted text==, a #project/sub-1 tag, and some wikilinks: [[Link 1]] and [[Link 2|Alias]].

## Tasks

- [ ] Implement parsing layer
- [x] Scaffold project

## Code

\`\`\`ts
function test() {
  return true;
}
\`\`\`

## Data

| Header 1 | Header 2 |
|----------|----------|
| A        | B        |

![[Embed]]
`;

describe("Corpus smoke test", () => {
  it("parses a realistic document under 200ms and contains expected nodes", () => {
    const start = performance.now();
    const nodes = parseNodes(CORPUS);
    const end = performance.now();
    
    const names = nodes.map(n => n.name);
    
    expect(end - start).toBeLessThan(200);
    expect(names).toContain("Frontmatter");
    expect(names.filter(n => n === "Wikilink").length).toBeGreaterThanOrEqual(2);
    expect(names).toContain("Tag");
    expect(names).toContain("Highlight");
    expect(names).toContain("Table");
    expect(names).toContain("TaskMarker");
    expect(names).toContain("FencedCode");
    expect(names).toContain("Embed");
  });
});
