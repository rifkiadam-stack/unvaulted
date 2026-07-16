import { Extension, StateField, Transaction, EditorState, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { buildInlineDecorations } from "./widgets/inline";
import { buildLinkDecorations, uvOpenExternal } from "./widgets/links";
import { buildHrDecorations } from "./widgets/hr";
import { buildBlockquoteDecorations } from "./widgets/blockquote";
import { buildCalloutDecorations } from "./widgets/callout";
import { buildTaskDecorations } from "./widgets/task";
import { buildImageDecorations, uvBasePath } from "./widgets/image";
import { buildPropertiesDecorations } from "./widgets/properties";
import { buildTableDecorations } from "./widgets/table";
import { buildListMarkDecorations } from "./widgets/list";

import "./preview.css";

export { uvOpenExternal, uvBasePath };

function buildDecorations(state: EditorState): DecorationSet {
  const decos: Range<Decoration>[] = [];
  
  syntaxTree(state).iterate({
    enter(node) {
      buildInlineDecorations(state, node, decos);
      buildLinkDecorations(state, node, decos);
      buildHrDecorations(state, node, decos);
      
      const isCallout = buildCalloutDecorations(state, node, decos);
      if (!isCallout) {
        buildBlockquoteDecorations(state, node, decos);
      }
      
      buildTaskDecorations(state, node, decos);
      buildImageDecorations(state, node, decos);
      buildPropertiesDecorations(state, node, decos);
      buildTableDecorations(state, node, decos);
      buildListMarkDecorations(state, node, decos);
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
    if (tr.docChanged || tr.selection || syntaxTree(tr.state) != syntaxTree(tr.startState)) {
      return buildDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

export function livePreview(): Extension {
  return [livePreviewField];
}
