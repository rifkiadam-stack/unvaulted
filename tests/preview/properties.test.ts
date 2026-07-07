import { describe, it, expect, vi } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

// Mini DOM mock for headless testing
function createMockNode() {
  const children: any[] = [];
  const node = {
    className: "",
    textContent: "",
    appendChild: (n: any) => children.push(n),
    querySelectorAll: (sel: string) => {
      if (sel === ".uv-property-row") return children.filter(c => c.className.includes("uv-property-row"));
      if (sel === ".uv-property-key") return children.filter(c => c.className.includes("uv-property-key"));
      if (sel === ".uv-property-value") return children.filter(c => c.className.includes("uv-property-value"));
      return [];
    },
    classList: {
      contains: (cls: string) => node.className.includes(cls)
    }
  };
  return node;
}

describe("Properties widget", () => {
  it("renders properties widget for frontmatter when not revealed", () => {
    (globalThis as any).document = { createElement: () => createMockNode() };

    const yaml = "---\ntitle: test\ntags: [a, b]\n---";
    const fmText = "---\ntitle: test\ntags: [a, b]\n---";
    const state = createPreviewState(fmText + "\n\nbody text", { anchor: 40 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "PropertiesWidget");
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(0);
    expect(widgets[0].to).toBe(yaml.length);
    expect((widgets[0].spec.widget as any).text).toBe(yaml);
    
    // C4 DOM structural test
    const dom = widgets[0].spec.widget.toDOM() as any;
    const rows = dom.querySelectorAll(".uv-property-row");
    expect(rows.length).toBeGreaterThan(0);
    
    for (const row of Array.from(rows) as any[]) {
      if (row.classList.contains("uv-property-raw")) continue;
      
      const keys = row.querySelectorAll(".uv-property-key");
      const values = row.querySelectorAll(".uv-property-value");
      expect(keys.length).toBe(1);
      expect(values.length).toBe(1);
    }
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
