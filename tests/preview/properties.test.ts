import { describe, it, expect, vi } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

function createMockNode(tagName = "div") {
  const children: any[] = [];
  const classList = {
    add: (cls: string) => {
      if (!node.className.includes(cls)) node.className += (node.className ? " " : "") + cls;
    },
    contains: (cls: string) => node.className.includes(cls)
  };
  const node: any = {
    tagName,
    className: "",
    textContent: "",
    title: "",
    value: "",
    parentElement: null,
    appendChild: (n: any) => {
      if (n) {
        n.parentElement = node;
        children.push(n);
      }
    },
    replaceChild: (newChild: any, oldChild: any) => {
      const idx = children.indexOf(oldChild);
      if (idx !== -1) {
        children[idx] = newChild;
        if (newChild) newChild.parentElement = node;
        if (oldChild) oldChild.parentElement = null;
      }
    },
    focus: () => {},
    onclick: null,
    onblur: null,
    onkeydown: null,
    querySelectorAll: (sel: string) => {
      let results: any[] = [];
      const match = (n: any) => {
        if (sel.startsWith(".")) {
          const targetClass = sel.slice(1);
          if (n.className && n.className.split(" ").includes(targetClass)) {
            results.push(n);
          }
        }
        if (n._getChildren) {
          for (const c of n._getChildren()) match(c);
        }
      };
      for (const c of children) match(c);
      return results;
    },
    _getChildren: () => children,
    classList
  };
  return node;
}

describe("Properties widget", () => {
  it("renders properties widget for frontmatter when not revealed", () => {
    (globalThis as any).document = { createElement: (tag: string) => createMockNode(tag) };

    const yaml = "---\ntitle: test\ntags: [a, b]\n---";
    const state = createPreviewState(yaml + "\n\nbody text", { anchor: 40 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "PropertiesWidget");
    expect(widgets.length).toBe(1);
    
    const dom = widgets[0].spec.widget.toDOM({ state, dispatch: vi.fn() } as any);
    const rows = dom.querySelectorAll(".uv-property-row");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("clicking a scalar value swaps in an input", () => {
    (globalThis as any).document = { createElement: (tag: string) => createMockNode(tag) };
    const yaml = "---\ntitle: test\n---";
    const state = createPreviewState(yaml + "\n\nbody text goes here just for padding the document length out to 40 characters", { anchor: 40 });
    const widget = decorationsOf(state)[0].spec.widget as any;
    
    const dom = widget.toDOM({ state, dispatch: vi.fn() } as any);
    
    const valDisplays = dom.querySelectorAll(".uv-property-value");
    expect(valDisplays.length).toBe(1);
    
    // Simulate click
    valDisplays[0].onclick({ stopPropagation: () => {} });
    
    const inputs = dom.querySelectorAll(".uv-prop-input");
    expect(inputs.length).toBe(1);
    expect(inputs[0].value).toBe("test");
  });

  it("clicking a list value shows comma-joined items", () => {
    (globalThis as any).document = { createElement: (tag: string) => createMockNode(tag) };
    const yaml = "---\ntags: [a, b]\n---";
    const state = createPreviewState(yaml + "\n\nbody text goes here just for padding the document length out to 40 characters", { anchor: 40 });
    const widget = decorationsOf(state)[0].spec.widget as any;
    
    const dom = widget.toDOM({ state, dispatch: vi.fn() } as any);
    const valDisplays = dom.querySelectorAll(".uv-property-value");
    valDisplays[0].onclick({ stopPropagation: () => {} });
    
    const inputs = dom.querySelectorAll(".uv-prop-input");
    expect(inputs[0].value).toBe("a, b");
  });

  it("raw rows stay read-only", () => {
    (globalThis as any).document = { createElement: (tag: string) => createMockNode(tag) };
    const yaml = "---\nunknown: test\n---";
    const state = createPreviewState(yaml + "\n\nbody text goes here just for padding the document length out to 40 characters", { anchor: 40 });
    const widget = decorationsOf(state)[0].spec.widget as any;
    
    const dom = widget.toDOM({ state, dispatch: vi.fn() } as any);
    const rawRows = dom.querySelectorAll(".uv-property-raw");
    expect(rawRows.length).toBe(1);
    
    const valDisplays = rawRows[0].querySelectorAll(".uv-property-value");
    expect(valDisplays[0].onclick).toBeNull(); // No editable click handler
  });

  it("reveals frontmatter when cursor touches it", () => {
    const yaml = "---\ntitle: Hello\ntags: [a, b]\n---";
    const state = createPreviewState(yaml + "\n\nout", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "PropertiesWidget");
    expect(widgets.length).toBe(0);
  });
});
