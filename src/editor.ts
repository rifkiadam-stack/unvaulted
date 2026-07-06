import { EditorView, basicSetup } from "codemirror";

export function createEditor(parent: HTMLElement, initialText: string): EditorView {
  return new EditorView({
    doc: initialText,
    extensions: [basicSetup],
    parent
  });
}
