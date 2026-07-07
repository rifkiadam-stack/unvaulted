import { EditorState } from "@codemirror/state";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";
import { unvaultedMarkdown } from "../../src/markdown/lang";

export function parseNodes(doc: string): Array<{ name: string; text: string }> {
  const state = EditorState.create({
    doc,
    extensions: [unvaultedMarkdown()]
  });
  
  ensureSyntaxTree(state, doc.length, 5000);
  const tree = syntaxTree(state);
  
  const nodes: Array<{ name: string; text: string }> = [];
  tree.iterate({
    enter: (node) => {
      nodes.push({
        name: node.name,
        text: doc.slice(node.from, node.to)
      });
    }
  });
  
  return nodes;
}
