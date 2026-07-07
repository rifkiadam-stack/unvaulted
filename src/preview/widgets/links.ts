import { EditorState, Range, Facet } from "@codemirror/state";
import { Decoration, WidgetType, EditorView } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

export const uvOpenExternal = Facet.define<(url: string) => void>();

export const linkClickHandler = EditorView.domEventHandlers({
  click(event, view) {
    if (event.ctrlKey || event.metaKey) {
      const target = event.target as HTMLElement;
      const linkEl = target.closest('[data-url]');
      if (linkEl) {
        const url = linkEl.getAttribute('data-url');
        if (url) {
          const handlers = view.state.facet(uvOpenExternal);
          if (handlers.length > 0) {
            handlers[0](url);
            event.preventDefault();
            return true;
          }
        }
      }
    }
  }
});

export class InertLinkWidget extends WidgetType {
  constructor(readonly text: string, readonly type: "Wikilink" | "Embed") {
    super();
  }
  eq(other: InertLinkWidget) {
    return this.text === other.text && this.type === other.type;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    span.className = this.type === "Wikilink" ? "uv-wikilink uv-inert" : "uv-embed uv-inert";
    span.title = "No vault — link disabled";
    return span;
  }
}

export function buildLinkDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  const name = node.name;
  
  if (name === "Link") {
    const revealed = isRevealed(state, node.from, node.to, false);
    if (!revealed) {
      const nodeObj = node.node;
      
      let child = nodeObj.firstChild;
      let url = "";
      while (child) {
        if (child.name === "URL") {
          url = state.doc.sliceString(child.from, child.to);
        }
        if (["LinkMark", "URL", "LinkTitle"].includes(child.name)) {
          decos.push(Decoration.replace({}).range(child.from, child.to));
        }
        child = child.nextSibling;
      }
      
      decos.push(Decoration.mark({
        class: "uv-link",
        attributes: {
          "data-url": url,
          "title": url
        }
      }).range(node.from, node.to));
    }
  } else if (name === "Wikilink") {
    const revealed = isRevealed(state, node.from, node.to, false);
    if (!revealed) {
      const text = state.doc.sliceString(node.from + 2, node.to - 2);
      const split = text.split("|");
      const displayText = split.length > 1 ? split[1] : split[0];
      
      decos.push(Decoration.replace({
        widget: new InertLinkWidget(displayText, "Wikilink")
      }).range(node.from, node.to));
    }
  } else if (name === "Embed") {
    const revealed = isRevealed(state, node.from, node.to, false);
    if (!revealed) {
      const text = state.doc.sliceString(node.from + 3, node.to - 2);
      decos.push(Decoration.replace({
        widget: new InertLinkWidget(text, "Embed")
      }).range(node.from, node.to));
    }
  } else if (name === "Tag") {
    const revealed = isRevealed(state, node.from, node.to, false);
    if (!revealed) {
      decos.push(Decoration.mark({ class: "uv-tag" }).range(node.from, node.to));
    }
  }
}
