export interface CalloutHeader { type: string; title: string; }

export function parseCalloutHeader(firstLineText: string): CalloutHeader | null {
  const match = firstLineText.match(/^\[!([a-zA-Z]+)\]\s*(.*)$/);
  if (match) {
    return {
      type: match[1].toLowerCase(),
      title: match[2].trim()
    };
  }
  return null;
}
