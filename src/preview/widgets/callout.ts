import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";
import { parseCalloutHeader } from "../../markdown/callout";

class CalloutHeaderWidget extends WidgetType {
  constructor(readonly type: string, readonly title: string) {
    super();
  }
  eq(other: CalloutHeaderWidget) {
    return this.type === other.type && this.title === other.title;
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "uv-callout";
    div.setAttribute("data-callout-type", this.type);
    
    // Title
    const titleSpan = document.createElement("span");
    titleSpan.className = "uv-callout-title";
    titleSpan.textContent = this.title || (this.type.charAt(0).toUpperCase() + this.type.slice(1));
    div.appendChild(titleSpan);
    
    return div;
  }
}

export function buildCalloutDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]): boolean {
  if (node.name === "Blockquote") {
    const firstLine = state.doc.lineAt(node.from);
    const textWithoutQuote = firstLine.text.replace(/^>\s*/, "");
    const parsed = parseCalloutHeader(textWithoutQuote);
    if (parsed) {
      const revealed = isRevealed(state, node.from, node.to, true);
      
      decos.push(Decoration.mark({ class: "uv-callout-body" }).range(node.from, node.to));
      
      if (!revealed) {
        const endOfLine = Math.min(firstLine.to, node.to);
        
        decos.push(Decoration.replace({
          widget: new CalloutHeaderWidget(parsed.type, parsed.title),
          block: true
        }).range(node.from, endOfLine));
        
        // Hide QuoteMarks on subsequent lines
        let child = node.node.firstChild;
        while (child) {
          if (child.name === "QuoteMark" && child.from >= endOfLine) {
            const textAfter = state.doc.sliceString(child.to, child.to + 1);
            const hideTo = textAfter === " " ? child.to + 1 : child.to;
            decos.push(Decoration.replace({}).range(child.from, hideTo));
          }
          child = child.nextSibling;
        }
      }
      return true; // Handled as callout
    }
  }
  return false;
}
