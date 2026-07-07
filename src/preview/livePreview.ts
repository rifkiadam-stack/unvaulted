import { Extension, StateField, Transaction, EditorState, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { buildInlineDecorations } from "./widgets/inline";

function buildDecorations(state: EditorState): DecorationSet {
  const decos: Range<Decoration>[] = [];
  
  syntaxTree(state).iterate({
    enter(node) {
      buildInlineDecorations(state, node, decos);
    }
  });

  decos.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
  return Decoration.set(decos);
}

export const livePreviewField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(decorations, tr: Transaction) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

export function livePreview(): Extension {
  return [livePreviewField];
}
