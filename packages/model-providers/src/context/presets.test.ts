import { describe, expect, it } from "vitest";
import { buildContextMessages, findContextAction } from "./presets.js";

describe("buildContextMessages", () => {
  it("builds rephrase messages with selection", () => {
    const messages = buildContextMessages("rephrase", "Hello world");
    expect(messages).toHaveLength(2);
    expect(messages[1]?.content).toContain("Hello world");
  });

  it("uses custom prompt when provided", () => {
    const messages = buildContextMessages("custom", "Hi", "Make it formal");
    expect(messages[1]?.content).toContain("Make it formal");
  });
});

describe("findContextAction", () => {
  it("finds known actions", () => {
    expect(findContextAction("improve")?.label).toBe("Improve");
  });
});
