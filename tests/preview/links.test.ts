import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";

describe("Links, Wikilinks, Embeds, Tags", () => {
  it("hides link marks and styles text when not revealed", () => {
    // 01234567890123
    // [text](url)
    const state = createPreviewState("[text](url) out", { anchor: 13 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-link");
    expect(styling.length).toBe(1);
    expect(styling[0].from).toBe(0);
    expect(styling[0].to).toBe(11);
    
    const replacements = decos.filter(d => !d.spec.class && d.spec.widget === undefined);
    // Should hide [, ], (, url, )
    expect(replacements.length).toBeGreaterThan(2);
  });

  it("renders inert wikilinks without alias", () => {
    const state = createPreviewState("[[wiki]] out", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined);
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(0);
    expect(widgets[0].to).toBe(8);
    expect((widgets[0].spec.widget as any).text).toBe("wiki");
    expect((widgets[0].spec.widget as any).type).toBe("Wikilink");
  });

  it("renders inert wikilinks with alias", () => {
    const state = createPreviewState("[[wiki|alias]] out", { anchor: 15 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined);
    expect(widgets.length).toBe(1);
    expect((widgets[0].spec.widget as any).text).toBe("alias");
  });

  it("renders inert embeds", () => {
    const state = createPreviewState("![[embed]] out", { anchor: 12 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined);
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(0);
    expect(widgets[0].to).toBe(10);
    expect((widgets[0].spec.widget as any).text).toBe("embed");
    expect((widgets[0].spec.widget as any).type).toBe("Embed");
    
    // Assert it's inert and no src/fetch
    expect((widgets[0].spec.widget as any).src).toBeUndefined();
  });

  it("styles tags without hiding", () => {
    const state = createPreviewState("#project out", { anchor: 10 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-tag");
    expect(styling.length).toBe(1);
    expect(styling[0].from).toBe(0);
    expect(styling[0].to).toBe(8);
  });
});
