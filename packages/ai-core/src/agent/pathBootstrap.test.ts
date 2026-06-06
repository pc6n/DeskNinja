import { describe, expect, it } from "vitest";
import { bootstrapToolsFromMessage } from "./pathBootstrap.js";

describe("bootstrapToolsFromMessage", () => {
  it("reads explicit file paths from the user message", () => {
    const calls = bootstrapToolsFromMessage(
      "its here /Users/christenpat/dev/DeskNinja/apps/desktop/src/styles.css",
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.tool).toBe("read_file");
    expect(calls[0]?.input.path).toBe(
      "/Users/christenpat/dev/DeskNinja/apps/desktop/src/styles.css",
    );
  });

  it("explores repo roots without file extensions", () => {
    const calls = bootstrapToolsFromMessage("summarize /Users/christenpat/dev/DeskNinja");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.tool).toBe("explore_repo");
  });
});
