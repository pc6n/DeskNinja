import { describe, expect, it } from "vitest";
import {
  buildMessageMetrics,
  formatAssistantContent,
  formatDuration,
} from "./chatMetrics";

describe("formatDuration", () => {
  it("formats milliseconds and seconds", () => {
    expect(formatDuration(0.2)).toBe("<1ms");
    expect(formatDuration(420)).toBe("420ms");
    expect(formatDuration(1530)).toBe("1.5s");
  });
});

describe("buildMessageMetrics", () => {
  it("uses total time when first token time was not captured", () => {
    expect(buildMessageMetrics(100, 0, 1500)).toEqual({
      firstTokenMs: 1400,
      totalMs: 1400,
    });
  });
});

describe("formatAssistantContent", () => {
  it("simplifies inline math", () => {
    expect(formatAssistantContent("$2 \\times 3 = 6$ 😊")).toBe("2 × 3 = 6 😊");
  });
});
