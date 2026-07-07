import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

class BulletWidget extends WidgetType {
  eq(other: BulletWidget) {
    return true;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "uv-list-bullet";
    span.textContent = "•";
    return span;
  }
}

export function buildListMarkDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "ListMark") {
    const revealed = isRevealed(state, node.from, node.to, true); // Block behavior
    if (!revealed) {
      const text = state.doc.sliceString(node.from, node.to).trim();
      
      const isBullet = /^[+*-]$/.test(text);
      if (isBullet) {
        decos.push(Decoration.replace({
          widget: new BulletWidget()
        }).range(node.from, node.to));
      } else {
        // Ordered list (like "1." or "1)")
        decos.push(Decoration.mark({
          class: "uv-list-number"
        }).range(node.from, node.to));
      }
    }
  }
}
