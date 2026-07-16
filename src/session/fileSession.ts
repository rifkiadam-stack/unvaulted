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
