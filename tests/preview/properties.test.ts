import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

describe("Properties widget", () => {
  it("renders properties widget for frontmatter when not revealed", () => {
    const yaml = "---\ntitle: Hello\ntags: [a, b]\n---";
    // Place cursor outside the frontmatter
    const state = createPreviewState(yaml + "\n\nout", { anchor: yaml.length + 3 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "PropertiesWidget");
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(0);
    expect(widgets[0].to).toBe(yaml.length);
    expect((widgets[0].spec.widget as any).text).toBe(yaml);
  });

  it("reveals frontmatter when cursor touches it", () => {
    const yaml = "---\ntitle: Hello\ntags: [a, b]\n---";
    // Place cursor inside the frontmatter
    const state = createPreviewState(yaml + "\n\nout", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "PropertiesWidget");
    expect(widgets.length).toBe(0); // Revealed
  });
});
