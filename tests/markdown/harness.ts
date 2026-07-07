import { EditorState } from "@codemirror/state";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";
import { unvaultedMarkdown } from "../../src/markdown/lang";

export function parseNodes(doc: string): Array<{ name: string; text: string; from: number; to: number }> {
  const state = EditorState.create({
    doc,
    extensions: [unvaultedMarkdown()]
  });
  
  ensureSyntaxTree(state, doc.length, 5000);
  
  const nodes: Array<{ name: string; text: string; from: number; to: number }> = [];
  syntaxTree(state).iterate({
    enter(node) {
      nodes.push({
        name: node.name,
        text: state.doc.sliceString(node.from, node.to),
        from: node.from,
        to: node.to
      });
    }
  });
  return nodes;
}
