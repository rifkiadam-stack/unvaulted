import { describe, it, expect } from "vitest";
import { parseNodes } from "./harness";

describe("GFM baseline parsing", () => {
  it("parses ATXHeading1", () => {
    const nodes = parseNodes("# h");
    expect(nodes.map(n => n.name)).toContain("ATXHeading1");
  });

  it("parses StrongEmphasis", () => {
    const nodes = parseNodes("**b**");
    expect(nodes.map(n => n.name)).toContain("StrongEmphasis");
  });

  it("parses Emphasis", () => {
    const nodes = parseNodes("*i*");
    expect(nodes.map(n => n.name)).toContain("Emphasis");
  });

  it("parses Strikethrough", () => {
    const nodes = parseNodes("~~s~~");
    expect(nodes.map(n => n.name)).toContain("Strikethrough");
  });

  it("parses InlineCode", () => {
    const nodes = parseNodes("`c`");
    expect(nodes.map(n => n.name)).toContain("InlineCode");
  });

  it("parses FencedCode and CodeInfo", () => {
    const nodes = parseNodes("```js\ncode\n```");
    const names = nodes.map(n => n.name);
    expect(names).toContain("FencedCode");
    expect(names).toContain("CodeInfo");
  });

  it("parses Blockquote", () => {
    const nodes = parseNodes("> q");
    expect(nodes.map(n => n.name)).toContain("Blockquote");
  });

  it("parses BulletList", () => {
    const nodes = parseNodes("- x");
    expect(nodes.map(n => n.name)).toContain("BulletList");
  });

  it("parses OrderedList", () => {
    const nodes = parseNodes("1. x");
    expect(nodes.map(n => n.name)).toContain("OrderedList");
  });

  it("parses TaskMarker", () => {
    const nodes = parseNodes("- [ ] t");
    expect(nodes.map(n => n.name)).toContain("TaskMarker");
  });

  it("parses Table", () => {
    const nodes = parseNodes("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(nodes.map(n => n.name)).toContain("Table");
  });

  it("parses Link", () => {
    const nodes = parseNodes("[t](u)");
    expect(nodes.map(n => n.name)).toContain("Link");
  });

  it("parses Image", () => {
    const nodes = parseNodes("![a](u)");
    expect(nodes.map(n => n.name)).toContain("Image");
  });

  it("parses HorizontalRule", () => {
    const nodes = parseNodes("\n---\n");
    expect(nodes.map(n => n.name)).toContain("HorizontalRule");
  });
});
