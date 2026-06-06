import type { ToolCallRequest } from "../types/tools.js";

const PATH_PATTERN = /(?:~\/|\/[\w./-]+\.\w{1,8})/g;
const REPO_PATH_PATTERN = /(?:~\/|\/[\w./-]+)\/?(?!\.\w+)/g;
const FILE_EXTENSIONS = new Set([
  "css",
  "ts",
  "tsx",
  "js",
  "jsx",
  "rs",
  "md",
  "json",
  "toml",
  "yaml",
  "yml",
  "html",
  "txt",
]);

export function bootstrapToolsFromMessage(content: string): ToolCallRequest[] {
  const filePaths = extractFilePaths(content);
  if (filePaths.length > 0) {
    return filePaths.slice(0, 5).map((path) => ({
      id: crypto.randomUUID(),
      tool: "read_file",
      input: { path },
    }));
  }

  const repoPath = extractRepoPath(content);
  if (repoPath) {
    return [
      {
        id: crypto.randomUUID(),
        tool: "explore_repo",
        input: { path: repoPath },
      },
    ];
  }

  return [];
}

function extractFilePaths(content: string): string[] {
  const matches = content.match(PATH_PATTERN) ?? [];
  return dedupe(matches.filter(isFilePath));
}

function extractRepoPath(content: string): string | undefined {
  const matches = content.match(REPO_PATH_PATTERN) ?? [];
  const dirs = dedupe(matches.filter((path) => !isFilePath(path)));
  return dirs[0];
}

function isFilePath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext !== undefined && FILE_EXTENSIONS.has(ext);
}

function dedupe(paths: string[]): string[] {
  return [...new Set(paths)];
}
