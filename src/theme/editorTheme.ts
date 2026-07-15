import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const editorTheme = EditorView.theme({
  "&": {
    color: "var(--uv-text)",
    backgroundColor: "var(--uv-bg)",
  },
  ".cm-content": {
    caretColor: "var(--uv-text)",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--uv-text)"
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--uv-selection)"
  },
  ".cm-gutters": {
    display: "none"
  },
  ".cm-scroller": {
    justifyContent: "center"
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-line": { lineHeight: "1.6" }
});

export const markdownHighlightStyle = syntaxHighlighting(HighlightStyle.define([
  // Fenced-code tokens (One-Dark-adjacent palette)
  { tag: t.keyword, color: "#c678dd" },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: "#e06c75" },
  { tag: [t.propertyName], color: "#e06c75" },
  { tag: [t.variableName], color: "#e06c75" },
  { tag: [t.function(t.variableName)], color: "#61afef" },
  { tag: [t.labelName], color: "#e5c07b" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#d19a66" },
  { tag: [t.definition(t.name), t.separator], color: "var(--uv-text)" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#e5c07b" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.special(t.string)], color: "#56b6c2" },
  { tag: [t.meta, t.comment], color: "#7f848e", fontStyle: "italic" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#d19a66" },
  { tag: [t.string, t.inserted], color: "#98c379" },
  { tag: t.invalid, color: "#ffffff", backgroundColor: "#e05252" },
  
  // Markdown semantics
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "var(--uv-link)", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "var(--uv-text)" },
  
  // Revealed markdown syntax marks (raw **, ==, # etc.)
  { tag: t.processingInstruction, color: "var(--uv-text-faint)" }
]));
