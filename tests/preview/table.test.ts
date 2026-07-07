import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

describe("Table widget", () => {
  it("renders table widget when not revealed", () => {
    const tableText = "| A | B |\n|---|---|\n| C | D |";
    const state = createPreviewState(tableText + "\n\nout", { anchor: 33 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "TableWidget");
    expect(widgets.length).toBe(1);
    expect((widgets[0].spec.widget as any).text).toBe(tableText);
  });

  it("reveals raw table when cursor touches it", () => {
    const tableText = "| A | B |\n|---|---|\n| C | D |";
    const state = createPreviewState(tableText + "\n\nout", { anchor: 5 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "TableWidget");
    expect(widgets.length).toBe(0);
  });
});
