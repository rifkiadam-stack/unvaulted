import { describe, it, expect, beforeEach } from "vitest";
import { createPreviewState, decorationsOf } from "./harness";
import { setEmbedResolverForTests, clearEmbedCacheForTests, seedEmbedCacheForTests } from "../../src/preview/embedResolver";
import { uvBasePath } from "../../src/preview/widgets/image";

describe("Embed Resolver", () => {
  beforeEach(() => {
    clearEmbedCacheForTests();
  });

  it("renders image widget when cache is seeded with a path", () => {
    seedEmbedCacheForTests("C:\\vault|pic.png", "C:\\vault\\pic.png");
    const state = createPreviewState("![[pic.png]]\nout", { anchor: 15 }, [uvBasePath.of("C:\\vault")]);
    const decos = decorationsOf(state);
    
    const widgets = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "ImageWidget");
    expect(widgets.length).toBe(1);
    
    const imageWidget = widgets[0].spec.widget as any;
    expect(imageWidget.url).toBe("C:\\vault\\pic.png");
  });

  it("renders inert pill when cache is seeded with null", () => {
    seedEmbedCacheForTests("C:\\vault|pic.png", null);
    const state = createPreviewState("![[pic.png]]\nout", { anchor: 15 }, [uvBasePath.of("C:\\vault")]);
    const decos = decorationsOf(state);
    
    const inert = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "InertLinkWidget");
    expect(inert.length).toBe(1);
    
    const inertWidget = inert[0].spec.widget as any;
    expect(inertWidget.text).toBe("pic.png");
    expect(inertWidget.type).toBe("Embed");
  });

  it("renders inert pill and queues resolution on cache miss", async () => {
    let callCount = 0;
    setEmbedResolverForTests(async (baseDir, fileName) => {
      callCount++;
      expect(baseDir).toBe("C:\\vault");
      expect(fileName).toBe("pic.png");
      return null;
    });

    const state = createPreviewState("![[pic.png]]\nout", { anchor: 15 }, [uvBasePath.of("C:\\vault")]);
    const decos = decorationsOf(state);
    
    const inert = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "InertLinkWidget");
    expect(inert.length).toBe(1);
    
    // Simulate a second rebuild (like from typing) to ensure it doesn't queue again
    decorationsOf(state);
    
    expect(callCount).toBe(1);
  });

  it("renders inert pill and never calls resolver for non-image embeds", () => {
    let called = false;
    setEmbedResolverForTests(async () => {
      called = true;
      return null;
    });

    const state = createPreviewState("![[Some Note]]\nout", { anchor: 16 }, [uvBasePath.of("C:\\vault")]);
    const decos = decorationsOf(state);
    
    const inert = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "InertLinkWidget");
    expect(inert.length).toBe(1);
    expect(called).toBe(false);
  });

  it("renders inert pill and never calls resolver when no basePath is available", () => {
    let called = false;
    setEmbedResolverForTests(async () => {
      called = true;
      return null;
    });

    const state = createPreviewState("![[pic.png]]\nout", { anchor: 15 });
    const decos = decorationsOf(state);
    
    const inert = decos.filter(d => d.spec.widget !== undefined && d.spec.widget.constructor.name === "InertLinkWidget");
    expect(inert.length).toBe(1);
    expect(called).toBe(false);
  });
});
