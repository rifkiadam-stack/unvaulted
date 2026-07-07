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
    input.onchange = (e) => {
      view.dispatch({
        changes: taskToggleChange(input.checked, this.from, this.to)
      });
    };
    return input;
  }
}

export function taskToggleChange(checked: boolean, from: number, to: number) {
  return { from, to, insert: checked ? "[x]" : "[ ]" };
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
