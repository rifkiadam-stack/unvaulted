import { EditorView } from "@codemirror/view";
import { selectAll, undo, redo } from "@codemirror/commands";
import { toggleBold, toggleItalic, toggleStrike, toggleHighlight, insertHorizontalRule } from "../editing/format";

export interface MenuItem {
  label: string;
  hint?: string;
  action: () => void;
}

export type MenuEntry = MenuItem | "---";

export function showMenu(items: MenuEntry[], x: number, y: number) {
  const menu = document.createElement("div");
  menu.className = "uv-menu";
  
  items.forEach(item => {
    if (item === "---") {
      const sep = document.createElement("div");
      sep.className = "uv-menu-sep";
      menu.appendChild(sep);
    } else {
      const btn = document.createElement("button");
      btn.className = "uv-menu-item";
      
      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      btn.appendChild(labelSpan);
      
      if (item.hint) {
        const hintSpan = document.createElement("span");
        hintSpan.className = "uv-menu-hint";
        hintSpan.textContent = item.hint;
        btn.appendChild(hintSpan);
      }
      
      btn.onclick = (e) => {
        e.stopPropagation();
        closeMenu();
        item.action();
      };
      menu.appendChild(btn);
    }
  });

  document.body.appendChild(menu);
  
  const rect = menu.getBoundingClientRect();
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  
  let top = y;
  let left = x;
  
  if (top + rect.height > wh) {
    top = Math.max(0, y - rect.height);
  }
  if (left + rect.width > ww) {
    left = Math.max(0, ww - rect.width);
  }
  
  menu.style.top = top + "px";
  menu.style.left = left + "px";
  menu.style.maxHeight = (wh - 20) + "px";
  
  function closeMenu() {
    if (menu.parentNode) {
      document.body.removeChild(menu);
    }
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", closeMenu);
    document.removeEventListener("scroll", onScroll, true);
  }
  
  function onMouseDown(e: MouseEvent) {
    if (!menu.contains(e.target as Node)) closeMenu();
  }
  
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") closeMenu();
  }
  
  function onScroll(e: Event) {
    if (!menu.contains(e.target as Node)) closeMenu();
  }
  
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", closeMenu);
  document.addEventListener("scroll", onScroll, true);
}

export function installContextMenu(view: EditorView, opts: { isMarkdown: () => boolean }) {
  view.dom.addEventListener("contextmenu", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return; 
    }
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest(".uv-properties")) {
      return; 
    }
    
    e.preventDefault();
    
    const items: MenuEntry[] = [];
    
    if (opts.isMarkdown()) {
      items.push({
        label: "Bold", hint: "Ctrl+B", action: () => { toggleBold(view as any); view.focus(); }
      });
      items.push({
        label: "Italic", hint: "Ctrl+I", action: () => { toggleItalic(view as any); view.focus(); }
      });
      items.push({
        label: "Strikethrough", hint: "Ctrl+Shift+X", action: () => { toggleStrike(view as any); view.focus(); }
      });
      items.push({
        label: "Highlight", hint: "Ctrl+Shift+H", action: () => { toggleHighlight(view as any); view.focus(); }
      });
      items.push({
        label: "Insert horizontal rule", action: () => { insertHorizontalRule(view as any); view.focus(); }
      });
      items.push("---");
    }
    
    items.push({
      label: "Cut", action: () => {
        const text = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
        if (text) {
          navigator.clipboard.writeText(text);
          view.dispatch(view.state.replaceSelection(""));
        }
        view.focus();
      }
    });
    items.push({
      label: "Copy", action: () => {
        const text = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
        if (text) {
          navigator.clipboard.writeText(text);
        }
        view.focus();
      }
    });
    items.push({
      label: "Paste", action: () => {
        navigator.clipboard.readText().then(text => {
          view.dispatch(view.state.replaceSelection(text));
          view.focus();
        }).catch(err => {
          console.warn("Failed to read clipboard", err);
          view.focus();
        });
      }
    });
    items.push({
      label: "Select All", action: () => {
        selectAll(view);
        view.focus();
      }
    });
    items.push("---");
    items.push({
      label: "Undo", hint: "Ctrl+Z", action: () => {
        undo(view);
        view.focus();
      }
    });
    items.push({
      label: "Redo", hint: "Ctrl+Y", action: () => {
        redo(view);
        view.focus();
      }
    });
    
    showMenu(items, e.clientX, e.clientY);
  });
}
