import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

describe("Inline decorations", () => {
  it("hides delimiters and applies styling when not revealed", () => {
    // 01234567
    // *it* out
    const state = createPreviewState("*it* out", { anchor: 6 });
    const decos = decorationsOf(state);
    
    // Should have 1 styling mark and 2 replacement marks (for the asterisks)
    const styling = decos.filter(d => d.spec.class === "uv-em");
    expect(styling.length).toBe(1);
    expect(styling[0].from).toBe(0);
    expect(styling[0].to).toBe(4);
    
    const replacements = decos.filter(d => !d.spec.class);
    expect(replacements.length).toBe(2);
    expect(replacements[0].from).toBe(0);
    expect(replacements[0].to).toBe(1);
    expect(replacements[1].from).toBe(3);
    expect(replacements[1].to).toBe(4);
  });

  it("shows delimiters when revealed", () => {
    const state = createPreviewState("*it* out", { anchor: 2 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-em");
    expect(styling.length).toBe(1);
    
    const replacements = decos.filter(d => !d.spec.class);
    expect(replacements.length).toBe(0); // Marks not hidden
  });

  it("handles ATX headings correctly", () => {
    const state = createPreviewState("## Title\nout", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-h2");
    expect(styling.length).toBe(1);
    expect(styling[0].from).toBe(0);
    expect(styling[0].to).toBe(8);
    
    const replacements = decos.filter(d => !d.spec.class);
    expect(replacements.length).toBe(1);
    expect(replacements[0].from).toBe(0);
    expect(replacements[0].to).toBe(3); // '## ' should be hidden
  });
});
