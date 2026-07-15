import { describe, it, expect } from "vitest";
import { initialMode, nextMode } from "../../src/theme/themeMode";

describe("themeMode", () => {
  describe("initialMode", () => {
    it("returns dark when stored is null", () => {
      expect(initialMode(null)).toBe('dark');
    });

    it("returns light when stored is light", () => {
      expect(initialMode('light')).toBe('light');
    });

    it("returns dark when stored is garbage", () => {
      expect(initialMode('garbage')).toBe('dark');
      expect(initialMode('DARK')).toBe('dark');
    });
  });

  describe("nextMode", () => {
    it("toggles dark to light", () => {
      expect(nextMode('dark')).toBe('light');
    });

    it("toggles light to dark", () => {
      expect(nextMode('light')).toBe('dark');
    });
  });
});
