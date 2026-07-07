import { EditorState } from "@codemirror/state";
import { unvaultedMarkdown } from "../../src/markdown/lang";
import { livePreviewField } from "../../src/preview/livePreview";
import { ensureSyntaxTree } from "@codemirror/language";

export function createPreviewState(doc: string, selection?: {anchor: number, head?: number}) {
  let state = EditorState.create({
    doc,
    selection,
    extensions: [
      unvaultedMarkdown(),
      livePreviewField
    ]
  });
  
  ensureSyntaxTree(state, doc.length, 1000);
  
  // Re-run the update so decorations see the fully parsed syntax tree
  state = state.update({changes: []}).state;
  
  return state;
}

export function decorationsOf(state: EditorState) {
  const decos = state.field(livePreviewField);
  const result: any[] = [];
  const iter = decos.iter();
  while (iter.value) {
    result.push({
      from: iter.from,
      to: iter.to,
      // @ts-ignore
      spec: iter.value.spec
    });
    iter.next();
  }
  return result;
}
