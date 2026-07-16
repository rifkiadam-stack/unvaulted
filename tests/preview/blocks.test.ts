import { describe, it, expect } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";
import { taskToggleChange } from "../../src/preview/widgets/task";
import { uvBasePath, resolveImageSrc } from "../../src/preview/widgets/image";

describe("Block basics", () => {
  it("renders HR widget when cursor is away", () => {
    // 0123
    // ---
    // out
    const state = createPreviewState("hello\n\n---\nout", { anchor: 14 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "HrWidget");
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(7);
    expect(widgets[0].to).toBe(10);
  });

  it("reveals HR raw syntax when cursor is on the line", () => {
    const state = createPreviewState("hello\n\n---\nout", { anchor: 8 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "HrWidget");
    expect(widgets.length).toBe(0); // Revealed
  });

  it("hides QuoteMark and styles blockquote", () => {
    const state = createPreviewState("> quote\n\nout", { anchor: 11 });
    const decos = decorationsOf(state);
    
    const styling = decos.filter(d => d.spec.class === "uv-blockquote");
    expect(styling.length).toBe(1);
    
    const replacements = decos.filter(d => !d.spec.class && d.spec.widget === undefined);
    expect(replacements.length).toBeGreaterThan(0);
    expect(replacements[0].from).toBe(0);
    expect(replacements[0].to).toBe(2); // "> " should be hidden
  });

  it("renders task checkbox widget and toggles it", () => {
    const state = createPreviewState("- [ ] task", { anchor: 8 });
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "TaskCheckboxWidget");
    expect(widgets.length).toBe(1);
    expect(widgets[0].from).toBe(2);
    expect(widgets[0].to).toBe(5);
    expect((widgets[0].spec.widget as any).checked).toBe(false);

    // Toggle to checked
    let newState = state.update({
      changes: taskToggleChange(true, widgets[0].from, widgets[0].to)
    }).state;
    expect(newState.doc.toString()).toBe("- [x] task");

    // Toggle back to unchecked
    newState = newState.update({
      changes: taskToggleChange(false, widgets[0].from, widgets[0].to)
    }).state;
    expect(newState.doc.toString()).toBe("- [ ] task");
  });

  it("renders block image widget for image on its own line with basePath resolution", () => {
    const state = createPreviewState("![alt](pic.png)\nout", { anchor: 18 }, [uvBasePath.of("C:\\notes")]);
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "ImageWidget");
    expect(widgets.length).toBe(1);
    const widget = widgets[0].spec.widget as any;
    expect(widget.url).toBe("pic.png");
    // Assert block: true
    expect(widgets[0].spec.block).toBe(true);
    
    // Test pure logic directly without hitting DOM/toDOM()
    expect(resolveImageSrc("pic.png", "C:\\notes")).toBe("C:\\notes\\pic.png");
    expect(resolveImageSrc("pic%20space.png", "C:\\notes")).toBe("C:\\notes\\pic space.png");
    expect(resolveImageSrc("https://remote.com/img.png", "C:\\notes")).toBe("https://remote.com/img.png");
    expect(resolveImageSrc("pic.png", "/home/user/notes")).toBe("/home/user/notes/pic.png");
  });

  it("reveals block image when cursor touches line", () => {
    const state = createPreviewState("![alt](img.png)\nout", { anchor: 4 });
    const decos = decorationsOf(state);
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "ImageWidget");
    expect(widgets.length).toBe(0); // Revealed
  });
});
