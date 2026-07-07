import { describe, it, expect } from "vitest";
import { parseNodes } from "./harness";

describe("Obsidian inline extensions", () => {
  it("parses Highlight", () => {
    const nodes = parseNodes("==hi==");
    const names = nodes.map(n => n.name);
    expect(names).toContain("Highlight");
    expect(names.filter(n => n === "HighlightMark").length).toBe(2);
  });

  it("does not parse unclosed Highlight", () => {
    const nodes = parseNodes("==unclosed");
    expect(nodes.map(n => n.name)).not.toContain("Highlight");
  });

  it("parses Wikilink", () => {
    const nodes = parseNodes("[[Note name]]");
    expect(nodes.map(n => n.name)).toContain("Wikilink");
  });

  it("parses Wikilink with alias", () => {
    const nodes = parseNodes("[[Note|alias]]");
    expect(nodes.map(n => n.name)).toContain("Wikilink");
  });

  it("does not parse empty Wikilink", () => {
    const nodes = parseNodes("[[]]");
    expect(nodes.map(n => n.name)).not.toContain("Wikilink");
  });

  it("parses Embed and wins over Image", () => {
    const nodes = parseNodes("![[Note]]");
    const names = nodes.map(n => n.name);
    expect(names).toContain("Embed");
    expect(names).not.toContain("Image");
  });

  it("parses Tag", () => {
    const nodes = parseNodes("#project/sub-1");
    expect(nodes.map(n => n.name)).toContain("Tag");
  });

  it("does not parse mid-word Tag", () => {
    const nodes = parseNodes("a#b");
    expect(nodes.map(n => n.name)).not.toContain("Tag");
  });

  it("does not parse digit-start Tag", () => {
    const nodes = parseNodes("#1");
    expect(nodes.map(n => n.name)).not.toContain("Tag");
  });

  it("does not parse Tag in heading", () => {
    // Note: # heading should be parsed as ATXHeading1 by the block parser before inline parser
    const nodes = parseNodes("# heading");
    expect(nodes.map(n => n.name)).not.toContain("Tag");
  });
});
