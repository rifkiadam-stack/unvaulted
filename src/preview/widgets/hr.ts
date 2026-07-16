import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

class HrWidget extends WidgetType {
  toDOM() {
    // Wrapper carries the vertical spacing as padding: CodeMirror measures a
    // block widget's height excluding margins, so margins here cause click drift.
    const wrap = document.createElement("div");
    wrap.className = "uv-hr-wrap";
    const hr = document.createElement("hr");
    hr.className = "uv-hr";
    wrap.appendChild(hr);
    return wrap;
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
