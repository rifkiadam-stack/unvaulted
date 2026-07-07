import { describe, it, expect } from "vitest";
import { parseCalloutHeader } from "../../src/markdown/callout";

describe("Callout parsing", () => {
  it("parses valid callouts", () => {
    expect(parseCalloutHeader("[!note] Hello")).toEqual({ type: 'note', title: 'Hello' });
    expect(parseCalloutHeader("[!WARNING]")).toEqual({ type: 'warning', title: '' });
  });
  
  it("returns null for invalid callouts", () => {
    expect(parseCalloutHeader("[note] x")).toBeNull();
    expect(parseCalloutHeader("plain")).toBeNull();
  });
});
