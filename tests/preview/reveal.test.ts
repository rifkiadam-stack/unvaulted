import { describe, it, expect } from "vitest";
import { createPreviewState } from "./harness";
import { isRevealed } from "../../src/preview/reveal";

describe("isRevealed", () => {
  it("returns true for inline constructs when selection overlaps exactly", () => {
    // 01234
    // **x**
    const state = createPreviewState("**x**", { anchor: 2 });
    expect(isRevealed(state, 0, 5, false)).toBe(true);
  });
  
  it("returns true for inline constructs when selection touches edges", () => {
    let state = createPreviewState("**x**", { anchor: 0 }); // touches left
    expect(isRevealed(state, 0, 5, false)).toBe(true);
    
    state = createPreviewState("**x**", { anchor: 5 }); // touches right
    expect(isRevealed(state, 0, 5, false)).toBe(true);
  });

  it("returns false for inline constructs when selection is outside", () => {
    const state = createPreviewState("**x** out", { anchor: 6 });
    expect(isRevealed(state, 0, 5, false)).toBe(false);
  });

  it("returns true for block constructs when selection is on the same line", () => {
    const state = createPreviewState("# h1\nout", { anchor: 3 });
    expect(isRevealed(state, 0, 4, true)).toBe(true);
  });
  
  it("returns false for block constructs when selection is on a different line", () => {
    const state = createPreviewState("# h1\nout", { anchor: 6 }); // 'u'
    expect(isRevealed(state, 0, 4, true)).toBe(false);
  });
});
