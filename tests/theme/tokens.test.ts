import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { editorTheme, markdownHighlightStyle } from "../../src/theme/editorTheme";

describe("Theme token spec", () => {
  it("exports valid codemirror extensions", () => {
    expect(editorTheme).toBeDefined();
    expect(markdownHighlightStyle).toBeDefined();
  });

  it("contains required dark and light tokens in theme.css", () => {
    const cssPath = path.resolve(__dirname, "../../src/theme/theme.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Dark (default) block tokens
    const requiredDarkTokens = [
      "--uv-bg",
      "--uv-bg-secondary",
      "--uv-text",
      "--uv-text-muted",
      "--uv-text-faint",
      "--uv-accent",
      "--uv-link",
      "--uv-highlight-bg",
      "--uv-code-bg",
      "--uv-border",
      "--uv-selection",
      "--uv-hr",
      "--uv-callout-note",
      "--uv-callout-info",
      "--uv-callout-tip",
      "--uv-callout-success",
      "--uv-callout-question",
      "--uv-callout-warning",
      "--uv-callout-danger",
      "--uv-callout-quote",
    ];

    for (const token of requiredDarkTokens) {
      expect(cssContent).toContain(token);
    }

    // Light block overrides
    const lightBlock = cssContent.slice(cssContent.indexOf('[data-theme="light"]'));
    expect(lightBlock).toContain("--uv-bg");
    expect(lightBlock).toContain("--uv-text");
    expect(lightBlock).toContain("--uv-link");
  });

  it("styles every emitted uv-* class", () => {
    // 1. Scan src/preview and src/main.ts for class names
    const dirsToScan = [
      path.resolve(__dirname, "../../src/preview"),
      path.resolve(__dirname, "../../src/main.ts"),
      path.resolve(__dirname, "../../src/session/platform.ts"),
    ];

    const emittedClasses = new Set<string>();
    const uvClassRegex = /uv-[a-z0-9-]+/g;

    const scanDir = (dir: string) => {
      const stat = fs.statSync(dir);
      if (stat.isFile() && dir.endsWith('.ts')) {
        const content = fs.readFileSync(dir, "utf-8");
        const matches = content.match(uvClassRegex);
        if (matches) {
          matches.forEach((m: string) => {
            // Ignore partial dynamic matches
            if (m !== 'uv-h' && m !== 'uv-callout-') {
              emittedClasses.add(m);
            }
          });
        }
      } else if (stat.isDirectory()) {
        const files = fs.readdirSync(dir);
        files.forEach((f: string) => scanDir(path.join(dir, f)));
      }
    };

    dirsToScan.forEach(scanDir);

    // 2. Scan theme.css for class usages
    const cssPath = path.resolve(__dirname, "../../src/theme/theme.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // We can assume if the class name literal appears in the CSS file, it's styled.
    for (const cls of emittedClasses) {
      // Ignored non-classes or dynamically constructed parts we don't need to match exactly
      if (cls === "uv-inert" || cls === "uv-task-checkbox") {
        // these are present in css
      }
      if (!cssContent.includes(cls)) {
        throw new Error(`MISSING CLASS IN THEME: ${cls}`);
      }
    }
  });
});
