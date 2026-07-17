import { EditorState, Range, Facet } from "@codemirror/state";
import { Decoration, WidgetType } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";
import { isRevealed } from "../reveal";

import { convertFileSrc } from "@tauri-apps/api/core";

export const uvBasePath = Facet.define<string, string>({
  combine: values => values.length ? values[0] : (typeof document !== "undefined" ? document.baseURI : "")
});

export function resolveImageSrc(url: string, basePath: string): string {
  const rawUrl = url;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  
  let joined = rawUrl;
  if (basePath) {
    const sep = basePath.includes('\\') ? '\\' : '/';
    const cleanBase = basePath.replace(/[\\/]+$/, "");
    const cleanUrl = decodeURIComponent(rawUrl).replace(/^[\\/]+/, "");
    joined = `${cleanBase}${sep}${cleanUrl}`;
  } else {
    joined = decodeURIComponent(rawUrl);
  }
  return joined;
}

export class ImageWidget extends WidgetType {
  constructor(readonly url: string, readonly basePath: string) {
    super();
  }
  eq(other: ImageWidget) {
    return this.url === other.url && this.basePath === other.basePath;
  }
  toDOM() {
    const img = document.createElement("img");
    img.className = "uv-image";
    
    const resolved = resolveImageSrc(this.url, this.basePath);
    if (resolved.startsWith("http://") || resolved.startsWith("https://") || resolved.startsWith("data:")) {
      img.src = resolved;
      return img;
    }
    
    try {
      img.src = convertFileSrc(resolved);
    } catch (e) {
      img.src = resolved;
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
