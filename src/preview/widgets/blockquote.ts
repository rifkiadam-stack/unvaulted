import { EditorState, Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

export function buildBlockquoteDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "Blockquote") {
    const revealed = isRevealed(state, node.from, node.to, true);
    
    decos.push(Decoration.mark({ class: "uv-blockquote" }).range(node.from, node.to));
    
    if (!revealed) {
      let child = node.node.firstChild;
      while (child) {
        if (child.name === "QuoteMark") {
          const textAfter = state.doc.sliceString(child.to, child.to + 1);
          const hideTo = textAfter === " " ? child.to + 1 : child.to;
          decos.push(Decoration.replace({}).range(child.from, hideTo));
        }
        child = child.nextSibling;
      }
    }
  }
}
