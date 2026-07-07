import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType, EditorView } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly from: number, readonly to: number) {
    super();
  }
  eq(other: TaskCheckboxWidget) {
    return this.checked === other.checked && this.from === other.from && this.to === other.to;
  }
  toDOM(view: EditorView) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "uv-task-checkbox";
    input.checked = this.checked;
    input.onmousedown = (e) => {
      // Don't preventDefault, allow the checkbox to be clicked natively
      // But we must dispatch the CodeMirror change so it sticks.
    };
    input.onchange = (e) => {
      const newText = input.checked ? "[x]" : "[ ]";
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: newText }
      });
    };
    return input;
  }
  
  ignoreEvent() {
    return false; // CodeMirror should let events flow to this DOM element
  }
}

export function buildTaskDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "TaskMarker") {
    const revealed = isRevealed(state, node.from, node.to, false);
    if (!revealed) {
      const text = state.doc.sliceString(node.from, node.to).toLowerCase();
      const isChecked = text.includes("x");
      decos.push(Decoration.replace({
        widget: new TaskCheckboxWidget(isChecked, node.from, node.to)
      }).range(node.from, node.to));
    }
  }
}
