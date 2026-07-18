import { describe, it, expect } from "vitest";
import { EditorState, EditorSelection, Transaction } from "@codemirror/state";
import { toggleBold, toggleItalic, insertHorizontalRule } from "../../src/editing/format";

describe("Formatting commands", () => {
  it("wraps selection with markers", () => {
    let state = EditorState.create({ 
      doc: "hello world",
      selection: EditorSelection.single(6, 11)
    });
    const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
    
    toggleBold(target as any);
    expect(state.doc.toString()).toBe("hello **world**");
  });
  
  it("unwraps when text selected WITH markers", () => {
    let state = EditorState.create({ 
      doc: "hello **world**",
      selection: EditorSelection.single(6, 15)
    });
    const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
    
    toggleBold(target as any);
    expect(state.doc.toString()).toBe("hello world");
  });
  
  it("unwraps when markers sit just outside the selection", () => {
    let state = EditorState.create({ 
      doc: "hello **world**",
      selection: EditorSelection.single(8, 13) // selects 'world'
    });
    const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
    
    toggleBold(target as any);
    expect(state.doc.toString()).toBe("hello world");
  });
  
  it("inserts pair with cursor centered on empty selection", () => {
    let state = EditorState.create({ 
      doc: "hello ",
      selection: EditorSelection.single(6)
    });
    const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
    
    toggleBold(target as any);
    expect(state.doc.toString()).toBe("hello ****");
    expect(state.selection.main.head).toBe(8); // cursor between ** and **
  });
  
  it("italic wrap on already-bold text produces ***x***", () => {
    let state = EditorState.create({ 
      doc: "hello **world**",
      selection: EditorSelection.single(8, 13) // selects 'world'
    });
    const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
    
    toggleItalic(target as any);
    expect(state.doc.toString()).toBe("hello ***world***");
  });
  
  it("inserts HR below current line", () => {
    let state = EditorState.create({ 
      doc: "line one\nline two",
      selection: EditorSelection.single(4) // cursor in line one
    });
    const target = { state, dispatch: (tr: Transaction) => { state = tr.state; } };
    
    insertHorizontalRule(target as any);
    expect(state.doc.toString()).toBe("line one\n---\n\nline two");
  });
});
