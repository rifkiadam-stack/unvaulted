import { EditorView, basicSetup } from "codemirror";
import { unvaultedMarkdown } from "./markdown/lang";
import { livePreview } from "./preview/livePreview";

export function createEditor(parent: HTMLElement, initialText: string): EditorView {
  return new EditorView({
    doc: initialText,
    extensions: [
      basicSetup,
      unvaultedMarkdown(),
      livePreview()
    ],
    parent
  });
}
