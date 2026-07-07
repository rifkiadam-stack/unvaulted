import { EditorState, Range, Facet } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

export const uvBasePath = Facet.define<string, string>({
  combine: values => values.length ? values[0] : (typeof document !== "undefined" ? document.baseURI : "")
});

class ImageWidget extends WidgetType {
  constructor(readonly url: string, readonly basePath: string) {
    super();
  }
  eq(other: ImageWidget) {
    return this.url === other.url && this.basePath === other.basePath;
  }
  toDOM() {
    const img = document.createElement("img");
    img.className = "uv-image";
    try {
      img.src = new URL(this.url, this.basePath).href;
    } catch (e) {
      img.src = this.url;
    }
    return img;
  }
}

export function buildImageDecorations(state: EditorState, node: SyntaxNodeRef, decos: Range<Decoration>[]) {
  if (node.name === "Image") {
    const line = state.doc.lineAt(node.from);
    const lineText = line.text.trim();
    const imageText = state.doc.sliceString(node.from, node.to);
    
    if (lineText === imageText) {
      const revealed = isRevealed(state, node.from, node.to, true); // Block construct
      
      if (!revealed) {
        const nodeObj = node.node;
        let url = "";
        let child = nodeObj.firstChild;
        while (child) {
          if (child.name === "URL") {
            url = state.doc.sliceString(child.from, child.to);
            break;
          }
          child = child.nextSibling;
        }
        
        const basePath = state.facet(uvBasePath);
        
        decos.push(Decoration.replace({
          widget: new ImageWidget(url, basePath),
          block: true
        }).range(node.from, node.to));
      }
    }
  }
}
