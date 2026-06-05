import { describe, expect, it } from "vitest";
import { formatContextUsage, formatTokenCount } from "./formatTokens";

describe("formatTokenCount", () => {
  it("formats small and large counts", () => {
    expect(formatTokenCount(842)).toBe("842");
    expect(formatTokenCount(2400)).toBe("2.4k");
    expect(formatTokenCount(128000)).toBe("128k");
  });
});

describe("formatContextUsage", () => {
  it("shows used tokens with optional limit", () => {
    expect(formatContextUsage(2400)).toBe("2.4k tokens");
    expect(formatContextUsage(2400, 128000)).toBe("2.4k / 128k tokens");
    expect(formatContextUsage(2400, 128000, true)).toBe("~2.4k / 128k tokens");
  });
});
