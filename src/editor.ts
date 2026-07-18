import { EditorView, basicSetup } from "codemirror";
import { Extension } from "@codemirror/state";
import { unvaultedMarkdown } from "./markdown/lang";
import { livePreview } from "./preview/livePreview";

import { editorTheme, markdownHighlightStyle } from "./theme/editorTheme";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { toggleBold, toggleItalic, toggleStrike, toggleHighlight } from "./editing/format";

export function markdownMode(): Extension[] {
  return [
    markdownHighlightStyle,
    unvaultedMarkdown(),
    livePreview(),
    Prec.high(keymap.of([
      { key: "Mod-b", run: toggleBold },
      { key: "Mod-i", run: toggleItalic },
      { key: "Mod-Shift-x", run: toggleStrike },
      { key: "Mod-Shift-h", run: toggleHighlight }
    ]))
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
