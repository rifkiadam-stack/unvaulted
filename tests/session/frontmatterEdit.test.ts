import { describe, it, expect } from "vitest";
import { 
  parseFrontmatterBlock, 
  serializeFrontmatter, 
  setProp, 
  removeProp, 
  addProp,
  todayIso
} from "../../src/session/frontmatterEdit";

describe("frontmatterEdit module", () => {
  const roundTrip = (text: string) => {
    const parsed = parseFrontmatterBlock(text);
    if (!parsed) return null;
    return serializeFrontmatter(parsed);
  };

  it("round trips basic scalar", () => {
    const text = "---\ntitle: Hello World\n---\n";
    expect(roundTrip(text)).toBe(text);
  });

  it("round trips quoted scalar and re-quotes if needed", () => {
    const text = '---\ntitle: "Hello: World"\n---\n';
    expect(roundTrip(text)).toBe(text);
  });

  it("parses inline list and serializes to equivalent block list", () => {
    const text = "---\ntags: [a, b]\n---\n";
    const parsed = parseFrontmatterBlock(text);
    expect(parsed).toEqual([{ key: "tags", value: { kind: "list", items: ["a", "b"] } }]);
    
    const serialized = serializeFrontmatter(parsed!);
    expect(serialized).toBe("---\ntags:\n  - a\n  - b\n---\n");
  });

  it("round trips list format block", () => {
    const text = "---\ntags:\n  - a\n  - b\n---\n";
    expect(roundTrip(text)).toBe(text);
  });

  it("parses simple unknown keys as scalars", () => {
    const text = "---\ncustom_scalar: hello world\n---\n";
    const parsed = parseFrontmatterBlock(text);
    expect(parsed).toEqual([{ key: "custom_scalar", value: { kind: "scalar", value: "hello world" } }]);
    expect(roundTrip(text)).toBe(text);
  });

  it("parses unknown keys as lists if formatted as lists and preserves quotes on round-trip", () => {
    const text = '---\nrelated:\n  - "[[cs50]]"\n  - "#tag"\n---\n';
    const parsed = parseFrontmatterBlock(text);
    expect(parsed).toEqual([{ key: "related", value: { kind: "list", items: ["[[cs50]]", "#tag"] } }]);
    // the round-trip should re-add the quotes because of special characters (starts with [, contains #)
    expect(roundTrip(text)).toBe(text);
  });

  it("preserves genuinely complex keys as raw, byte-identically", () => {
    const text = "---\nnested:\n  prop: val\n---\n";
    const parsed = parseFrontmatterBlock(text);
    expect(parsed).toEqual([{ key: "nested", value: { kind: "raw", lines: ["nested:", "  prop: val"] } }]);
    expect(roundTrip(text)).toBe(text);
  });
  
  it("preserves empty lines inside raw block byte-identically", () => {
    const text = "---\nunknown: block\n\n  some stuff\n---\n";
    expect(roundTrip(text)).toBe(text);
  });

  it("setProp modifies a property", () => {
    const parsed = parseFrontmatterBlock("---\ntitle: old\n---\n")!;
    const updated = setProp(parsed, "title", { kind: "scalar", value: "new" });
    expect(serializeFrontmatter(updated)).toBe("---\ntitle: new\n---\n");
  });

  it("removeProp removes a property", () => {
    const parsed = parseFrontmatterBlock("---\ntitle: old\ntags:\n  - a\n---\n")!;
    const updated = removeProp(parsed, "tags");
    expect(serializeFrontmatter(updated)).toBe("---\ntitle: old\n---\n");
  });

  it("addProp adds property with default values", () => {
    const parsed = parseFrontmatterBlock("---\ntitle: old\n---\n")!;
    
    // date prefill
    const updated1 = addProp(parsed, "created");
    expect(updated1[1].key).toBe("created");
    expect((updated1[1].value as any).value).toBe(todayIso(new Date()));

    // list prefill
    const updated2 = addProp(updated1, "tags");
    expect(updated2[2].key).toBe("tags");
    expect((updated2[2].value as any).items).toEqual([]);
    
    // empty scalar prefill
    const updated3 = addProp(updated2, "trigger");
    expect(updated3[3].key).toBe("trigger");
    expect((updated3[3].value as any).value).toBe("");
    
    // adding existing key does nothing
    const updated4 = addProp(updated3, "title");
    expect(updated4.length).toBe(updated3.length);
  });
});
