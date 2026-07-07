import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("hr");
    hr.className = "uv-hr";
    return hr;
  }
}

export function buildHrDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "HorizontalRule") {
    const revealed = isRevealed(state, node.from, node.to, true);
    if (!revealed) {
      decos.push(Decoration.replace({
        widget: new HrWidget(),
        block: true
      }).range(node.from, node.to));
    }
  }
}
