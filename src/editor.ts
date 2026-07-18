import { EditorView, basicSetup } from "codemirror";
import { unvaultedMarkdown } from "./markdown/lang";
import { livePreview } from "./preview/livePreview";

import { Extension } from "@codemirror/state";

import { editorTheme, markdownHighlightStyle } from "./theme/editorTheme";

export function markdownMode(): Extension[] {
  return [
    markdownHighlightStyle,
    unvaultedMarkdown(),
    livePreview()
  ];
}

export function createEditor(parent: HTMLElement, initialText: string, extraExtensions: Extension[] = []): EditorView {
  return new EditorView({
    doc: initialText,
    extensions: [
      basicSetup,
      EditorView.lineWrapping,
      editorTheme,
      ...extraExtensions
    ],
    parent
  });
}
