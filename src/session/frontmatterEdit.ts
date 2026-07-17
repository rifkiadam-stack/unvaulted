import { frontmatterEndOffset } from './fileSession';

export type PropValue = { kind: "scalar"; value: string }
                      | { kind: "list"; items: string[] }
                      | { kind: "raw"; lines: string[] };

export interface PropEntry { key: string; value: PropValue; }

export const SUGGESTED_KEYS = ["trigger","tags","created","updated","type","title","sources"] as const;

export function todayIso(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseFrontmatterBlock(text: string): PropEntry[] | null {
  const offset = frontmatterEndOffset(text);
  if (offset === 0) return null;
  
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  let inner = "";
  if (match) {
    inner = match[1];
  } else {
    const eofMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---$/);
    if (eofMatch) inner = eofMatch[1];
    else return null;
  }
  
  if (inner.trim() === "") return [];

  // Split strictly by LF, but preserve the exact lines to reconstruct CR if any
  const lines = inner.split(/\n/);
  const entries: PropEntry[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\r$/, '');
    
    const topLevelMatch = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!topLevelMatch) {
      entries.push({ key: `__raw_${i}`, value: { kind: "raw", lines: [rawLine] } });
      i++;
      continue;
    }
    
    const key = topLevelMatch[1];
    const val = topLevelMatch[2]; 
    const valTrim = val.trim();
    
    const unquote = (str: string) => {
      let s = str.trim();
      if (s.startsWith('"') && s.endsWith('"')) {
         s = s.slice(1, -1).replace(/\\"/g, '"');
      } else if (s.startsWith("'") && s.endsWith("'")) {
         s = s.slice(1, -1).replace(/\\'/g, "'");
      }
      return s;
    };

    if (valTrim.startsWith("[") && valTrim.endsWith("]")) {
      const innerList = valTrim.slice(1, -1);
      const items = innerList.split(",").map(s => unquote(s)).filter(s => s !== "");
      entries.push({ key, value: { kind: "list", items } });
      i++;
    } else if (valTrim === "" || valTrim === "[]") {
      let j = i + 1;
      let isComplex = false;
      let hasListItems = false;
      const items: string[] = [];
      
      while (j < lines.length) {
         const lookahead = lines[j].replace(/\r$/, '');
         const listMatch = lookahead.match(/^\s*-\s+(.*)$/);
         if (listMatch) {
           items.push(unquote(listMatch[1]));
           hasListItems = true;
           j++;
         } else if (lookahead.match(/^\s+[A-Za-z0-9_-]+\s*:/)) {
           isComplex = true;
           break;
         } else if (lookahead.match(/^\s+/)) {
           isComplex = true;
           break;
         } else if (lookahead.trim() === "") {
           break;
         } else {
           break;
         }
      }
      
      if (isComplex) {
        const rawLines = [rawLine];
        j = i + 1;
        while (j < lines.length) {
          const lookahead = lines[j].replace(/\r$/, '');
          if (lookahead.match(/^([A-Za-z0-9_-]+)\s*:/)) break;
          rawLines.push(lines[j]);
          j++;
        }
        entries.push({ key, value: { kind: "raw", lines: rawLines } });
        i = j;
      } else {
        if (hasListItems || valTrim === "[]") {
          entries.push({ key, value: { kind: "list", items } });
          i = j;
        } else {
          entries.push({ key, value: { kind: "scalar", value: "" } });
          i++;
        }
      }
    } else {
      if (key === "tags" || key === "sources" || key === "aliases") {
        const items = valTrim.split(",").map(s => unquote(s)).filter(s => s !== "");
        entries.push({ key, value: { kind: "list", items } });
      } else {
        entries.push({ key, value: { kind: "scalar", value: unquote(valTrim) } });
      }
      i++;
    }
  }
  
  return entries;
}

export function setProp(entries: PropEntry[], key: string, v: PropValue): PropEntry[] {
  const result = [...entries];
  const idx = result.findIndex(e => e.key === key);
  if (idx !== -1) {
    result[idx] = { key, value: v };
  } else {
    result.push({ key, value: v });
  }
  return result;
}

export function removeProp(entries: PropEntry[], key: string): PropEntry[] {
  return entries.filter(e => e.key !== key);
}

export function addProp(entries: PropEntry[], key: string): PropEntry[] {
  if (entries.some(e => e.key === key)) return entries;
  
  let v: PropValue;
  if (key === "created" || key === "updated") {
    v = { kind: "scalar", value: todayIso(new Date()) };
  } else if (key === "tags" || key === "sources") {
    v = { kind: "list", items: [] };
  } else {
    v = { kind: "scalar", value: "" };
  }
  
  return [...entries, { key, value: v }];
}

export function serializeFrontmatter(entries: PropEntry[]): string {
  let out = "---\n";
  
  const needsQuoting = (v: string): boolean => {
    if (v === "") return true;
    if (v.includes(":") || v.includes("#")) return true;
    if (/^[\[\{\->"' ]/.test(v)) return true;
    if (v.endsWith(" ")) return true;
    return false;
  };
  
  for (const entry of entries) {
    if (entry.value.kind === "raw") {
      for (let i = 0; i < entry.value.lines.length; i++) {
        const l = entry.value.lines[i];
        out += l + (i < entry.value.lines.length - 1 ? "\n" : "");
      }
      out += "\n";
    } else if (entry.value.kind === "scalar") {
      let v = entry.value.value;
      if (needsQuoting(v)) {
        v = `"${v.replace(/"/g, '\\"')}"`;
      }
      out += `${entry.key}: ${v}\n`;
    } else if (entry.value.kind === "list") {
      if (entry.value.items.length === 0) {
        out += `${entry.key}:\n`;
      } else {
        out += `${entry.key}:\n`;
        for (const item of entry.value.items) {
          let v = item;
          if (needsQuoting(v)) {
            v = `"${v.replace(/"/g, '\\"')}"`;
          }
          out += `  - ${v}\n`;
        }
      }
    }
  }
  out += "---\n";
  return out;
}
