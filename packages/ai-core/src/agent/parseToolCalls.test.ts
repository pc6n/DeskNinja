import { describe, expect, it } from "vitest";
import { parseTextToolCalls } from "./parseToolCalls.js";

describe("parseTextToolCalls", () => {
  it("parses name/parameters JSON emitted as assistant text", () => {
    const calls = parseTextToolCalls('{"name": "list_dir", "parameters": {"path": "~"}}');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      name: "list_dir",
      arguments: { path: "~" },
    });
  });

  it("parses fenced JSON blocks", () => {
    const calls = parseTextToolCalls(
      '```json\n{"name": "list_dir", "parameters": {"path": "~/Desktop"}}\n```',
    );
    expect(calls[0]?.arguments).toEqual({ path: "~/Desktop" });
  });

  it("ignores unrelated JSON", () => {
    const calls = parseTextToolCalls('{"foo": "bar"}');
    expect(calls).toHaveLength(0);
  });

  it("parses JSON with single-quoted path strings", () => {
    const calls = parseTextToolCalls(
      `{"name": "read_files", "parameters": {"paths":["/a/.gitignore", '/b/README.md']}}`,
    );
    expect(calls[0]?.name).toBe("read_files");
    expect(calls[0]?.arguments).toEqual({
      paths: ["/a/.gitignore", "/b/README.md"],
    });
  });
});
