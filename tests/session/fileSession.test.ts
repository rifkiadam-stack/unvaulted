import { describe, it, expect } from 'vitest';
import {
  emptySession,
  loadFile,
  updateText,
  isDirty,
  windowTitle,
  serializeForSave,
  afterSave,
  onCloseRequested,
  inlineTitle,
  dirOf,
  pastedImageName,
  imageMarkdownFor,
  frontmatterEndOffset
} from '../../src/session/fileSession';

describe('fileSession pure module', () => {
  it('creates empty session correctly', () => {
    const s = emptySession();
    expect(s.path).toBeNull();
    expect(s.loadedText).toBe('');
    expect(s.currentText).toBe('');
    expect(s.lineEnding).toBe('lf');
    expect(isDirty(s)).toBe(false);
    expect(windowTitle(s)).toBe('Unvaulted');
    expect(onCloseRequested(s)).toBe('close');
    expect(inlineTitle(s)).toBeNull();
  });

  it('loads file and normalizes CRLF', () => {
    const s = loadFile('C:\\docs\\note.md', 'hello\r\nworld');
    expect(s.path).toBe('C:\\docs\\note.md');
    expect(s.loadedText).toBe('hello\nworld');
    expect(s.currentText).toBe('hello\nworld');
    expect(s.lineEnding).toBe('crlf');
    expect(isDirty(s)).toBe(false);
    expect(windowTitle(s)).toBe('note.md — Unvaulted');
    expect(onCloseRequested(s)).toBe('close');
    expect(inlineTitle(s)).toBe('note');
  });

  it('handles LF files', () => {
    const s = loadFile('/home/user/test.txt', 'linux\nfile');
    expect(s.lineEnding).toBe('lf');
    expect(serializeForSave(s)).toBe('linux\nfile');
  });

  it('dirty transitions', () => {
    let s = loadFile('test.md', 'abc');
    expect(isDirty(s)).toBe(false);

    // Edit makes it dirty
    s = updateText(s, 'abcd');
    expect(isDirty(s)).toBe(true);
    expect(windowTitle(s)).toBe('test.md* — Unvaulted');
    expect(onCloseRequested(s)).toBe('ask');

    // Undo makes it clean again
    s = updateText(s, 'abc');
    expect(isDirty(s)).toBe(false);
    expect(windowTitle(s)).toBe('test.md — Unvaulted');
    expect(onCloseRequested(s)).toBe('close');

    // Edit again and save
    s = updateText(s, 'abcd');
    expect(isDirty(s)).toBe(true);
    s = afterSave(s);
    expect(isDirty(s)).toBe(false);
    expect(s.loadedText).toBe('abcd');
  });

  it('serializes for save with correct line endings', () => {
    let s = loadFile('test.md', 'a\r\nb\r\nc');
    s = updateText(s, 'a\nb\nc\nd'); // editor adds newlines as LF
    const saved = serializeForSave(s);
    expect(saved).toBe('a\r\nb\r\nc\r\nd');
  });

  it('inlineTitle extracts basename without extension', () => {
    expect(inlineTitle(loadFile('note.md', ''))).toBe('note');
    expect(inlineTitle(loadFile('C:\\path\\my-file.markdown', ''))).toBe('my-file');
    expect(inlineTitle(loadFile('/var/noext', ''))).toBe('noext');
  });

  describe("dirOf", () => {
    it("extracts directory from windows path", () => {
      expect(dirOf("C:\\Notes\\meeting.md")).toBe("C:\\Notes");
    });
    it("extracts directory from posix path", () => {
      expect(dirOf("/home/user/notes/meeting.md")).toBe("/home/user/notes");
    });
    it("returns empty string if no slash", () => {
      expect(dirOf("meeting.md")).toBe("");
      expect(dirOf("")).toBe("");
    });
  });

  describe("paste helpers", () => {
    it("generates exact padded name from date", () => {
      const d = new Date(2026, 6, 17, 9, 5, 2); // July (6), 17th, 09:05:02
      expect(pastedImageName(d)).toBe("Pasted image 20260717-090502.png");
    });
    
    it("encodes spaces for markdown but preserves rest", () => {
      expect(imageMarkdownFor("Pasted image 20260717-090502.png"))
        .toBe("![[Pasted image 20260717-090502.png]]");
    });
  });

  describe("frontmatterEndOffset", () => {
    it("doc with frontmatter -> offset of body start", () => {
      const text = "---\ntitle: test\n---\nBody starts here";
      expect(frontmatterEndOffset(text)).toBe(20);
    });

    it("no frontmatter -> 0", () => {
      const text = "Just some text without frontmatter";
      expect(frontmatterEndOffset(text)).toBe(0);
    });

    it("unterminated fence -> 0", () => {
      const text = "---\ntitle: test\nBody starts here without closing fence";
      expect(frontmatterEndOffset(text)).toBe(0);
    });

    it("frontmatter only (no body) -> end of doc", () => {
      const text = "---\ntitle: test\n---";
      expect(frontmatterEndOffset(text)).toBe(19);
    });
  });
});
