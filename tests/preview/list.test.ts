import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

describe("ListMark widget", () => {
  it("renders bullet widget for unordered list mark", () => {
    const state = createPreviewState("- item\nout", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "BulletWidget");
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(0);
    expect(widgets[0].to).toBe(1); // The "-" mark
  });

  it("adds number class to ordered list mark", () => {
    const state = createPreviewState("1. item\nout", { anchor: 11 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-list-number");
    expect(styling.length).toBe(1);
    expect(styling[0].from).toBe(0);
    expect(styling[0].to).toBe(2); // The "1." mark
  });

  it("reveals list mark when cursor is on the line", () => {
    const state = createPreviewState("- item\nout", { anchor: 2 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "BulletWidget");
    expect(widgets.length).toBe(0); // Revealed
  });
});
