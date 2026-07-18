import { StateCommand, EditorSelection } from "@codemirror/state";

export function toggleInline(marker: string): StateCommand {
  return ({ state, dispatch }) => {
    const changes = state.changeByRange(range => {
      const len = marker.length;
      if (range.empty) {
        return {
          changes: { from: range.from, insert: marker + marker },
          range: EditorSelection.cursor(range.from + len)
        };
      }
      
      const text = state.sliceDoc(range.from, range.to);
      const char = marker[0];
      
      let innerExact = false;
      if (text.startsWith(marker) && text.endsWith(marker) && text.length >= len * 2) {
        innerExact = true;
        if (text.length > len * 2) {
          if (text[len] === char || text[text.length - len - 1] === char) {
            innerExact = false;
          }
        }
      }
      
      if (innerExact) {
        return {
          changes: { from: range.from, to: range.to, insert: text.slice(len, -len) },
          range: EditorSelection.range(range.from, range.to - len * 2)
        };
      }
      
      const before = state.sliceDoc(Math.max(0, range.from - len), range.from);
      const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + len));
      const beforeBeyond = state.sliceDoc(Math.max(0, range.from - len - 1), Math.max(0, range.from - len));
      const afterBeyond = state.sliceDoc(Math.min(state.doc.length, range.to + len), Math.min(state.doc.length, range.to + len + 1));
      
      const outerExact = (before === marker && after === marker) && (beforeBeyond !== char) && (afterBeyond !== char);
      
      if (outerExact) {
        return {
          changes: [
            { from: range.from - len, to: range.from, insert: "" },
            { from: range.to, to: range.to + len, insert: "" }
          ],
          range: EditorSelection.range(range.from - len, range.to - len)
        };
      }
      
      return {
        changes: [
          { from: range.from, insert: marker },
          { from: range.to, insert: marker }
        ],
        range: EditorSelection.range(range.from + len, range.to + len)
      };
    });
    
    dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
    return true;
  };
}

export const toggleBold = toggleInline("**");
export const toggleItalic = toggleInline("*");
export const toggleStrike = toggleInline("~~");
export const toggleHighlight = toggleInline("==");

export const insertHorizontalRule: StateCommand = ({ state, dispatch }) => {
  const changes = state.changeByRange(range => {
    const line = state.doc.lineAt(range.head);
    return {
      changes: { from: line.to, insert: "\n---\n" },
      range: EditorSelection.cursor(line.to + 5)
    };
  });
  dispatch(state.update(changes, { scrollIntoView: true, userEvent: "input" }));
  return true;
};
