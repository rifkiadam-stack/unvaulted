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

  it("hides delimiters for bold, strikethrough, highlight, and code", () => {
    // Bold
    const s1 = createPreviewState("**b** out", { anchor: 9 });
    const rep1 = decorationsOf(s1).filter(d => !d.spec.class);
    expect(rep1.length).toBe(2);
    expect(rep1[0].from).toBe(0); expect(rep1[0].to).toBe(2);
    expect(rep1[1].from).toBe(3); expect(rep1[1].to).toBe(5);

    // Strikethrough
    const s2 = createPreviewState("~~s~~ out", { anchor: 9 });
    const rep2 = decorationsOf(s2).filter(d => !d.spec.class);
    expect(rep2.length).toBe(2);

    // Highlight
    const s3 = createPreviewState("==h== out", { anchor: 9 });
    const rep3 = decorationsOf(s3).filter(d => !d.spec.class);
    expect(rep3.length).toBe(2);

    // Code
    const s4 = createPreviewState("`c` out", { anchor: 7 });
    const rep4 = decorationsOf(s4).filter(d => !d.spec.class);
    expect(rep4.length).toBe(2);
  });

  it("handles ATX headings correctly", () => {
    const state = createPreviewState("## Title\nout", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-h2");
    expect(styling.length).toBe(1);
    expect(styling[0].from).toBe(0);
    expect(styling[0].to).toBe(0); // Line decoration spans 0 characters
    
    const replacements = decos.filter(d => !d.spec.class);
    expect(replacements.length).toBe(1);
    expect(replacements[0].from).toBe(0);
    expect(replacements[0].to).toBe(3); // '## ' should be hidden
  });
});
