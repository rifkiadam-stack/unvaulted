import { EditorState, Range } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";
import { parseFrontmatterBlock, serializeFrontmatter, setProp, removeProp, SUGGESTED_KEYS, addProp } from "../../session/frontmatterEdit";
import { frontmatterEndOffset } from "../../session/fileSession";

let pendingFocusKey: string | null = null;

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
        currentValueStr = entry.value.value;
        if (currentValueStr === "") {
          valDisplay.innerHTML = `<span style="color: var(--uv-text-muted); font-style: italic;">Empty</span>`;
        } else {
          valDisplay.textContent = entry.value.value;
        }
      } else if (entry.value.kind === "list") {
        currentValueStr = entry.value.items.join(", ");
        if (entry.value.items.length === 0) {
          valDisplay.innerHTML = `<span style="color: var(--uv-text-muted); font-style: italic;">Empty</span>`;
        } else {
          for (const item of entry.value.items) {
            const chip = document.createElement("span");
            chip.className = "uv-property-chip";
            chip.textContent = item;
            valDisplay.appendChild(chip);
          }
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
      valDisplay.onmousedown = () => {
        pendingFocusKey = entry.key;
      };
      
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
          
          // C9: Restore the DOM row manually before dispatching
          if (entry.value.kind === "scalar") {
            currentValueStr = newVal;
            if (newVal === "") {
              valDisplay.innerHTML = `<span style="color: var(--uv-text-muted); font-style: italic;">Empty</span>`;
            } else {
              valDisplay.textContent = newVal;
            }
          } else {
            currentValueStr = (v as any).items.join(", ");
            valDisplay.innerHTML = "";
            if ((v as any).items.length === 0) {
              valDisplay.innerHTML = `<span style="color: var(--uv-text-muted); font-style: italic;">Empty</span>`;
            } else {
              for (const item of (v as any).items) {
                const chip = document.createElement("span");
                chip.className = "uv-property-chip";
                chip.textContent = item;
                valDisplay.appendChild(chip);
              }
            }
          }
          valContainer.replaceChild(valDisplay, input);

          const currentDocText = view.state.doc.toString();
          const offset = frontmatterEndOffset(currentDocText);
          const currentFrontmatter = currentDocText.slice(0, offset);

          if (newText !== currentFrontmatter) {
            view.dispatch({
              changes: { from: 0, to: offset, insert: newText }
            });
          }
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

      if (pendingFocusKey === entry.key) {
        pendingFocusKey = null;
        setTimeout(() => {
          valDisplay.onclick!({ stopPropagation: () => {} } as any);
        }, 0);
      }
    }
    
    // Add property footer
    const existingKeys = new Set(entries.map(e => e.key));
    const availableKeys = SUGGESTED_KEYS.filter(k => !existingKeys.has(k));
    
    const footer = document.createElement("div");
    footer.className = "uv-prop-footer";
    
    const addBtn = document.createElement("button");
    addBtn.className = "uv-prop-add";
    addBtn.textContent = "+ Add property";
    
    const menu = document.createElement("div");
    menu.className = "uv-prop-add-menu";
    menu.style.display = "none";
    
    const searchInput = document.createElement("input");
    searchInput.className = "uv-prop-add-input uv-prop-input";
    searchInput.type = "text";
    searchInput.placeholder = "Property name...";
    menu.appendChild(searchInput);
    
    const listContainer = document.createElement("div");
    listContainer.className = "uv-prop-add-list";
    menu.appendChild(listContainer);
    
    let closeMenu = () => {};
    
    const doAdd = (k: string) => {
      const key = k.trim();
      if (!key) return;
      if (!/^[A-Za-z0-9_-]+$/.test(key)) return;
      if (existingKeys.has(key)) return;
      
      pendingFocusKey = key;
      const updated = addProp(entries, key);
      const newText = serializeFrontmatter(updated);
      const offset = frontmatterEndOffset(view.state.doc.toString());
      view.dispatch({
        changes: { from: 0, to: offset, insert: newText }
      });
    };
    
    const renderList = (filter: string) => {
      listContainer.innerHTML = "";
      const matches = availableKeys.filter(k => k.toLowerCase().startsWith(filter.toLowerCase()));
      if (matches.length === 0) {
        const emptyItem = document.createElement("div");
        emptyItem.className = "uv-prop-menu-item uv-prop-menu-empty";
        emptyItem.textContent = "no matches";
        listContainer.appendChild(emptyItem);
      } else {
        for (const k of matches) {
          const item = document.createElement("div");
          item.className = "uv-prop-menu-item";
          item.textContent = k;
          item.onclick = (e) => {
            e.stopPropagation();
            doAdd(k);
          };
          listContainer.appendChild(item);
        }
      }
    };
    
    searchInput.oninput = () => renderList(searchInput.value);
    searchInput.onkeydown = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        doAdd(searchInput.value);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        closeMenu();
      }
    };
    
    addBtn.onclick = (e) => {
      e.stopPropagation();
      if (menu.style.display === "flex") {
        closeMenu();
        return;
      }
      
      searchInput.value = "";
      renderList("");
      
      const rect = addBtn.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.left = `${rect.left}px`;
      
      const viewportHeight = typeof window !== 'undefined' ? (window.innerHeight || 768) : 768;
      const spaceBelow = viewportHeight - rect.bottom;
      
      if (spaceBelow < 200) {
        menu.style.top = "auto";
        menu.style.bottom = `${viewportHeight - rect.top}px`;
        menu.style.maxHeight = `${Math.min(320, rect.top - 12)}px`;
      } else {
        menu.style.top = `${rect.bottom}px`;
        menu.style.bottom = "auto";
        menu.style.maxHeight = `${Math.min(320, spaceBelow - 12)}px`;
      }
      menu.style.overflowY = "auto";
      menu.style.display = "flex";
      menu.style.flexDirection = "column";
      
      closeMenu = (ev?: Event) => {
        if (ev && ev.type === "scroll" && ev.target instanceof Node && menu.contains(ev.target)) {
          return;
        }
        menu.style.display = "none";
        if (typeof document !== 'undefined') {
          document.removeEventListener("mousedown", onDocClick);
          document.removeEventListener("keydown", onKeyDown);
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener("scroll", closeMenu, true);
          window.removeEventListener("resize", closeMenu);
        }
      };
      
      const onDocClick = (ev: MouseEvent) => {
        if (!menu.contains(ev.target as Node) && ev.target !== addBtn) {
          closeMenu();
        }
      };
      
      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          ev.preventDefault();
          closeMenu();
        }
      };
      
      if (typeof document !== 'undefined') {
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKeyDown);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener("scroll", closeMenu, true);
        window.addEventListener("resize", closeMenu);
      }
      
      setTimeout(() => searchInput.focus(), 0);
    };
    
    footer.appendChild(addBtn);
    footer.appendChild(menu);
    div.appendChild(footer);
    
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
