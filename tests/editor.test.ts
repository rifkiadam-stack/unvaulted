import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { createEditor } from "../src/editor";

describe("Editor Module", () => {
  it("should construct an EditorState with doc 'hello'", () => {
    const state = EditorState.create({ doc: "hello" });
    expect(state.doc.toString()).toBe("hello");
  });

  it("should export createEditor function", () => {
    expect(typeof createEditor).toBe("function");
  });
});
