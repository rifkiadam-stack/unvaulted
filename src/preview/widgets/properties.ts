import { EditorState, Range } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";
import { parseFrontmatterBlock, serializeFrontmatter, setProp, removeProp } from "../../session/frontmatterEdit";
import { frontmatterEndOffset } from "../../session/fileSession";

class PropertiesWidget extends WidgetType {
  constructor(readonly text: string, readonly from: number) {
    super();
  }
  
  eq(other: PropertiesWidget) {
    return this.text === other.text;
  }

  ignoreEvent() {
    return true;
  }
  
  toDOM(view: EditorView) {
    const div = document.createElement("div");
    div.className = "uv-properties";
    
    const header = document.createElement("div");
    header.className = "uv-properties-header";
    header.textContent = "Properties";
    div.appendChild(header);
    
    const entries = parseFrontmatterBlock(this.text);
    if (!entries) return div;

    for (const entry of entries) {
      const row = document.createElement("div");
      row.className = "uv-property-row";
      
      const keyEl = document.createElement("span");
      keyEl.className = "uv-property-key";
      keyEl.textContent = entry.key;
      
      if (entry.value.kind === "raw") {
        row.classList.add("uv-property-raw");
        row.title = "complex value — edit as raw YAML by moving the cursor into the block";
        const valEl = document.createElement("div");
        valEl.className = "uv-property-value";
        valEl.textContent = entry.value.lines.join("\n");
        row.appendChild(keyEl);
        row.appendChild(valEl);
        div.appendChild(row);
        continue;
      }

      const valContainer = document.createElement("div");
      valContainer.className = "uv-property-value-container";
      
      const valDisplay = document.createElement("div");
      valDisplay.className = "uv-property-value";
      
      let currentValueStr = "";
      if (entry.value.kind === "scalar") {
        valDisplay.textContent = entry.value.value;
        currentValueStr = entry.value.value;
      } else if (entry.value.kind === "list") {
        currentValueStr = entry.value.items.join(", ");
        for (const item of entry.value.items) {
          const chip = document.createElement("span");
          chip.className = "uv-property-chip";
          chip.textContent = item;
          valDisplay.appendChild(chip);
        }
      }
      
      valContainer.appendChild(valDisplay);
      
      const removeBtn = document.createElement("button");
      removeBtn.className = "uv-prop-remove";
      removeBtn.textContent = "×";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        const updated = removeProp(entries, entry.key);
        const newText = serializeFrontmatter(updated);
        const offset = frontmatterEndOffset(view.state.doc.toString());
        view.dispatch({
          changes: { from: 0, to: offset, insert: newText }
        });
      };
      
      row.appendChild(keyEl);
      row.appendChild(valContainer);
      row.appendChild(removeBtn);
      div.appendChild(row);

      // Editable behavior
      valDisplay.onclick = (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.className = "uv-prop-input";
        input.value = currentValueStr;
        
        const commit = () => {
          if (input.parentElement !== valContainer) return; // already committed/canceled
          const newVal = input.value;
          let v;
          if (entry.value.kind === "scalar") {
            v = { kind: "scalar", value: newVal };
          } else {
            v = { kind: "list", items: newVal.split(",").map(s => s.trim()).filter(Boolean) };
          }
          const updated = setProp(entries, entry.key, v as any);
          const newText = serializeFrontmatter(updated);
          const offset = frontmatterEndOffset(view.state.doc.toString());
          view.dispatch({
            changes: { from: 0, to: offset, insert: newText }
          });
        };
        
        const cancel = () => {
          if (input.parentElement !== valContainer) return;
          valContainer.replaceChild(valDisplay, input);
        };
        
        input.onblur = () => commit();
        input.onkeydown = (ke) => {
          if (ke.key === "Enter") {
            ke.preventDefault();
            commit();
          } else if (ke.key === "Escape") {
            ke.preventDefault();
            cancel();
          }
        };
        
        valContainer.replaceChild(input, valDisplay);
        input.focus();
      };
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
        widget: new PropertiesWidget(text, node.from),
        block: true
      }).range(node.from, node.to));
    }
  }
}
