export type LineEnding = 'lf' | 'crlf';

export interface SessionState {
  path: string | null;
  loadedText: string;
  currentText: string;
  lineEnding: LineEnding;
}

export function emptySession(): SessionState {
  return {
    path: null,
    loadedText: '',
    currentText: '',
    lineEnding: 'lf',
  };
}

export function loadFile(path: string, rawContents: string): SessionState {
  const lineEnding: LineEnding = rawContents.includes('\r\n') ? 'crlf' : 'lf';
  // Normalize to LF internally
  const normalized = rawContents.replace(/\r\n/g, '\n');
  return {
    path,
    loadedText: normalized,
    currentText: normalized,
    lineEnding,
  };
}

export function updateText(s: SessionState, text: string): SessionState {
  return {
    ...s,
    currentText: text,
  };
}

export function isDirty(s: SessionState): boolean {
  return s.currentText !== s.loadedText;
}

// Helper to extract basename from full Windows or Unix paths
function getBasename(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1];
}

export function windowTitle(s: SessionState): string {
  if (!s.path) {
    return 'Unvaulted';
  }
  const basename = getBasename(s.path);
  const dirtyMarker = isDirty(s) ? '*' : '';
  return `${basename}${dirtyMarker} — Unvaulted`;
}

export function serializeForSave(s: SessionState): string {
  if (s.lineEnding === 'crlf') {
    // If it's already mixed (shouldn't be, since we normalize), we split and join
    return s.currentText.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  }
  return s.currentText;
}

export function afterSave(s: SessionState): SessionState {
  return {
    ...s,
    loadedText: s.currentText,
  };
}

export type CloseDecision = 'close' | 'ask';

export function onCloseRequested(s: SessionState): CloseDecision {
  return isDirty(s) ? 'ask' : 'close';
}

export function dirOf(path: string): string {
  if (!path) return '';
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSlash === -1) return '';
  return path.substring(0, lastSlash);
}

export function inlineTitle(s: SessionState): string | null {
  if (!s.path) return null;
  const basename = getBasename(s.path);
  const dotIdx = basename.lastIndexOf('.');
  if (dotIdx > 0) {
    return basename.substring(0, dotIdx);
  }
  return basename;
}

export function pastedImageName(now: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  return `Pasted image ${y}${m}${d}-${h}${min}${s}.png`;
}

export function imageMarkdownFor(name: string): string {
  return `![[${name}]]`;
}

export function frontmatterEndOffset(text: string): number {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    return match[0].length;
  }
  
  const eofMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---$/);
  if (eofMatch) {
    return eofMatch[0].length;
  }
  
  return 0;
}

export function pastedImageRefs(text: string): Set<string> {
  const set = new Set<string>();
  const regex = /!\[\[(Pasted image \d{8}-\d{6}\.png)\]\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    set.add(match[1]);
  }
  return set;
}

export function droppedPastedImages(before: string, after: string): string[] {
  const beforeRefs = pastedImageRefs(before);
  const afterRefs = pastedImageRefs(after);
  const dropped: string[] = [];
  
  for (const ref of beforeRefs) {
    if (!afterRefs.has(ref)) {
      dropped.push(ref);
    }
  }
  
  return dropped.sort();
}
