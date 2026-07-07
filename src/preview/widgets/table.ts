import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

class TableWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: TableWidget) {
    return this.text === other.text;
  }
  toDOM() {
    const table = document.createElement("table");
    table.className = "uv-table";
    
    const lines = this.text.split("\n").filter(l => l.trim().length > 0);
    
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Divider line looks like `|---|---|`
      if (line.match(/^\|?(\s*:?-+:?\s*\|?)+$/)) {
        continue;
      }
      
      if (line.startsWith("|")) line = line.substring(1);
      if (line.endsWith("|")) line = line.substring(0, line.length - 1);
      
      const cells = line.split("|").map(s => s.trim());
      
      const tr = document.createElement("tr");
      const isHeaderRow = (i === 0 && lines.length > 1 && lines[1].trim().match(/^\|?(\s*:?-+:?\s*\|?)+$/));
      
      if (isHeaderRow) {
        let thead = table.querySelector("thead");
        if (!thead) {
          thead = document.createElement("thead");
          table.insertBefore(thead, tbody);
        }
        thead.appendChild(tr);
      } else {
        tbody.appendChild(tr);
      }
      
      for (const cell of cells) {
        const td = document.createElement(isHeaderRow ? "th" : "td");
        td.textContent = cell;
        tr.appendChild(td);
      }
    }
    
    return table;
  }
}

export function buildTableDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "Table") {
    const revealed = isRevealed(state, node.from, node.to, true);
    if (!revealed) {
      const text = state.doc.sliceString(node.from, node.to);
      decos.push(Decoration.replace({
        widget: new TableWidget(text),
        block: true
      }).range(node.from, node.to));
    }
  }
}
