import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

describe("Callout", () => {
  it("renders callout widget and hides first line when not revealed", () => {
    // 012345678901234567890
    // > [!note] Title
    // > body
    // out
    const state = createPreviewState("> [!note] Title\n> body\n\nout", { anchor: 25 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "CalloutHeaderWidget");
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(0);
    expect(widgets[0].to).toBe(15);
    expect((widgets[0].spec.widget as any).type).toBe("note");
    expect((widgets[0].spec.widget as any).title).toBe("Title");
  });

  it("reveals raw callout when cursor touches it", () => {
    const state = createPreviewState("> [!note] Title\n> body\n\nout", { anchor: 4 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "CalloutHeaderWidget");
    expect(widgets.length).toBe(0);
  });
});
