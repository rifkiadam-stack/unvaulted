import { EditorState, Range } from "@codemirror/state";
import { Decoration } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

export function buildInlineDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  const name = node.name;
  
  if (["StrongEmphasis", "Emphasis", "Strikethrough", "InlineCode", "Highlight"].includes(name)) {
    const revealed = isRevealed(state, node.from, node.to, false);
    
    let cls = "";
    if (name === "StrongEmphasis") cls = "uv-strong";
    else if (name === "Emphasis") cls = "uv-em";
    else if (name === "Strikethrough") cls = "uv-strike";
    else if (name === "InlineCode") cls = "uv-code-inline";
    else if (name === "Highlight") cls = "uv-highlight";

    decos.push(Decoration.mark({ class: cls }).range(node.from, node.to));

    if (!revealed) {
      let targetMark = "";
      if (name === "StrongEmphasis") targetMark = "EmphasisMark";
      else if (name === "Emphasis") targetMark = "EmphasisMark";
      else if (name === "Strikethrough") targetMark = "StrikethroughMark";
      else if (name === "Highlight") targetMark = "HighlightMark";
      else if (name === "InlineCode") targetMark = "CodeMark";
      
      const nodeObj = node.node;
      let child = nodeObj.firstChild;
      while (child) {
        if (child.name === targetMark) {
          decos.push(Decoration.replace({}).range(child.from, child.to));
        }
        child = child.nextSibling;
      }
    }
  } else if (name.startsWith("ATXHeading") && name.length === 11) {
    const revealed = isRevealed(state, node.from, node.to, true); // Headings are block constructs
    
    const level = name.charAt(10);
    decos.push(Decoration.line({ class: `uv-h${level}` }).range(node.from));

    if (!revealed) {
      const nodeObj = node.node;
      const mark = nodeObj.getChild("HeaderMark");
      if (mark) {
        const textAfter = state.doc.sliceString(mark.to, mark.to + 1);
        const hideTo = textAfter === " " ? mark.to + 1 : mark.to;
        decos.push(Decoration.replace({}).range(mark.from, hideTo));
      }
    }
  }
}
