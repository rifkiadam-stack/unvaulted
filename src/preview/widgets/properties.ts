import { EditorState, Range } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

class PropertiesWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: PropertiesWidget) {
    return this.text === other.text;
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "uv-properties";
    
    const lines = this.text.split("\n");
    for (const line of lines) {
      if (line.trim() === "---") continue;
      
      const colonIdx = line.indexOf(":");
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        
        const row = document.createElement("div");
        row.className = "uv-property-row";
        
        const keyEl = document.createElement("span");
        keyEl.className = "uv-property-key";
        keyEl.textContent = key;
        
        const valEl = document.createElement("div");
        valEl.className = "uv-property-value";
        
        if (value.startsWith("[") && value.endsWith("]")) {
          const inner = value.slice(1, -1);
          const items = inner.split(",").map(s => s.trim()).filter(Boolean);
          for (const item of items) {
            const chip = document.createElement("span");
            chip.className = "uv-property-chip";
            chip.textContent = item;
            valEl.appendChild(chip);
          }
        } else {
          valEl.textContent = value;
        }
        
        row.appendChild(keyEl);
        row.appendChild(valEl);
        div.appendChild(row);
      } else if (line.trim()) {
        const row = document.createElement("div");
        row.className = "uv-property-row uv-property-raw";
        row.textContent = line;
        div.appendChild(row);
      }
    }
    
    return div;
  }
}

export function buildPropertiesDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "Frontmatter") {
    const revealed = isRevealed(state, node.from, node.to, true);
    if (!revealed) {
      const text = state.doc.sliceString(node.from, node.to);
      decos.push(Decoration.replace({
        widget: new PropertiesWidget(text),
        block: true
      }).range(node.from, node.to));
    }
  }
}
