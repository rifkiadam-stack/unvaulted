import { EditorState } from "@codemirror/state";

/**
 * Determines if a syntax node should be revealed (shown as raw markdown).
 * @param state The current editor state
 * @param from The start of the node
 * @param to The end of the node
 * @param isBlock Whether the node is a block construct
 * @returns true if the node should be revealed, false otherwise
 */
export function isRevealed(state: EditorState, from: number, to: number, isBlock: boolean): boolean {
  for (const range of state.selection.ranges) {
    if (isBlock) {
      // For block constructs, check if selection touches any line the block spans
      const startLine = state.doc.lineAt(from);
      const endLine = state.doc.lineAt(to);
      
      // The range touches the block if it overlaps [startLine.from, endLine.to]
      if (range.to >= startLine.from && range.from <= endLine.to) {
        return true;
      }
    } else {
      // For inline constructs, check if selection overlaps the span
      if (range.to >= from && range.from <= to) {
        return true;
      }
    }
  }
  return false;
}
