import { EditorView, basicSetup } from "codemirror";
import { unvaultedMarkdown } from "./markdown/lang";
import { livePreview } from "./preview/livePreview";

import { Extension } from "@codemirror/state";

export function createEditor(parent: HTMLElement, initialText: string, extraExtensions: Extension[] = []): EditorView {
  return new EditorView({
    doc: initialText,
    extensions: [
      basicSetup,
      unvaultedMarkdown(),
      livePreview(),
      ...extraExtensions
    ],
    parent
  });
}
