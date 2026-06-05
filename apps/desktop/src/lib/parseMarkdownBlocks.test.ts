import { describe, expect, it } from "vitest";
import { parseMarkdownBlocks } from "./parseMarkdownBlocks";

describe("parseMarkdownBlocks", () => {
  it("parses paragraphs separated by blank lines", () => {
    expect(parseMarkdownBlocks("First paragraph.\n\nSecond paragraph.")).toEqual([
      { type: "paragraph", text: "First paragraph." },
      { type: "paragraph", text: "Second paragraph." },
    ]);
  });

  it("parses bullet lists", () => {
    expect(parseMarkdownBlocks("- One\n- Two")).toEqual([
      { type: "list", ordered: false, items: ["One", "Two"] },
    ]);
  });

  it("parses fenced code blocks", () => {
    expect(parseMarkdownBlocks("Before\n\n```ts\nconst x = 1;\n```\n\nAfter")).toEqual([
      { type: "paragraph", text: "Before" },
      { type: "code", language: "ts", content: "const x = 1;\n" },
      { type: "paragraph", text: "After" },
    ]);
  });

  it("parses headings", () => {
    expect(parseMarkdownBlocks("## Summary")).toEqual([
      { type: "heading", level: 2, text: "Summary" },
    ]);
  });
});
