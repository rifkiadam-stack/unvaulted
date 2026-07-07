import { MarkdownConfig, InlineContext } from "@lezer/markdown";

const HighlightDelim = { resolve: "Highlight", mark: "HighlightMark" };

export const Highlight: MarkdownConfig = {
  defineNodes: [
    { name: "Highlight", block: false },
    { name: "HighlightMark" }
  ],
  parseInline: [{
    name: "Highlight",
    parse(cx: InlineContext, next: number, pos: number): number {
      if (next === 61 && cx.char(pos + 1) === 61) { // '=' is 61
        return cx.addDelimiter(HighlightDelim, pos, pos + 2, true, true);
      }
      return -1;
    },
    after: "Emphasis"
  }]
};

export const Wikilink: MarkdownConfig = {
  defineNodes: [{ name: "Wikilink", block: false }],
  parseInline: [{
    name: "Wikilink",
    parse(cx: InlineContext, next: number, pos: number): number {
      if (next === 91 && cx.char(pos + 1) === 91) { // '[' is 91
        let end = pos + 2;
        while (end < cx.end) {
          if (cx.char(end) === 93 && cx.char(end + 1) === 93) { // ']' is 93
            if (end > pos + 2) {
              cx.addElement(cx.elt("Wikilink", pos, end + 2));
              return end + 2;
            } else {
              return -1;
            }
          }
          end++;
        }
      }
      return -1;
    },
    before: "Link"
  }]
};

export const Embed: MarkdownConfig = {
  defineNodes: [{ name: "Embed", block: false }],
  parseInline: [{
    name: "Embed",
    parse(cx: InlineContext, next: number, pos: number): number {
      if (next === 33 && cx.char(pos + 1) === 91 && cx.char(pos + 2) === 91) { // '!' is 33
        let end = pos + 3;
        while (end < cx.end) {
          if (cx.char(end) === 93 && cx.char(end + 1) === 93) {
            if (end > pos + 3) {
              cx.addElement(cx.elt("Embed", pos, end + 2));
              return end + 2;
            } else {
              return -1;
            }
          }
          end++;
        }
      }
      return -1;
    },
    before: "Image"
  }]
};

export const Tag: MarkdownConfig = {
  defineNodes: [{ name: "Tag", block: false }],
  parseInline: [{
    name: "Tag",
    parse(cx: InlineContext, next: number, pos: number): number {
      if (next === 35) { // '#' is 35
        if (pos > 0) {
          const prev = String.fromCharCode(cx.char(pos - 1));
          if (/\w/.test(prev)) return -1;
        }
        
        let end = pos + 1;
        if (end >= cx.end) return -1;
        
        const firstChar = String.fromCharCode(cx.char(end));
        if (!/[a-zA-Z]/.test(firstChar)) return -1;
        
        end++;
        while (end < cx.end) {
          const char = String.fromCharCode(cx.char(end));
          if (!/[a-zA-Z0-9_\-\/]/.test(char)) break;
          end++;
        }
        
        cx.addElement(cx.elt("Tag", pos, end));
        return end;
      }
      return -1;
    },
    before: "Entity"
  }]
};
