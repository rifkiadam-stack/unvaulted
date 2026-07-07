import { describe, it, expect } from "vitest";
import { parseNodes } from "./harness";

describe("Frontmatter termination hotfix", () => {
  it("terminates frontmatter correctly when closing fence is present", () => {
    const doc = "---\ntitle: doc\ntags: [a, b]\n---\n\n# Head\nbody";
    const nodes = parseNodes(doc);
    
    // Frontmatter node should exist
    const fm = nodes.find(n => n.name === "Frontmatter");
    expect(fm).toBeDefined();
    
    // Calculate the end offset of the closing fence line
    const fenceEndOffset = "---\ntitle: doc\ntags: [a, b]\n---".length;
    expect(fm!.to).toBeLessThanOrEqual(fenceEndOffset);
    
    // ATXHeading1 should exist and be located AFTER the frontmatter
    const heading = nodes.find(n => n.name === "ATXHeading1");
    expect(heading).toBeDefined();
    expect(heading!.from).toBeGreaterThan(fm!.to);
    
    // The harness visits depth-first; if heading was a child, we wouldn't easily see it 
    // without structural checks. But since `heading.from > fm.to`, it physically CANNOT
    // be a child of Frontmatter.
  });

  it("spans to EOF if no closing fence is present (fallback behavior)", () => {
    const doc = "---\ntitle: doc\nbody";
    const nodes = parseNodes(doc);
    
    const fm = nodes.find(n => n.name === "Frontmatter");
    expect(fm).toBeDefined();
    
    expect(fm!.to).toBe(doc.length);
  });
});
