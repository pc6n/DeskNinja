export interface OllamaToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const AGENT_TOOL_DEFINITIONS: OllamaToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a single text file from an allowed workspace folder.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: { type: "string", description: "Absolute or ~ path to the file." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_files",
      description: "Read multiple text files in one call (max 20).",
      parameters: {
        type: "object",
        required: ["paths"],
        properties: {
          paths: {
            type: "array",
            items: { type: "string" },
            description: "File paths to read.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files in a directory, optionally filtered by glob like *.md.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: { type: "string", description: "Directory path." },
          glob: { type: "string", description: "Optional filename glob, e.g. *.ts." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_readonly_cmd",
      description: "Run an allowlisted read-only shell command (ls, find, head, tail, wc, cat).",
      parameters: {
        type: "object",
        required: ["cmd", "args"],
        properties: {
          cmd: { type: "string", description: "Command name without path." },
          args: {
            type: "array",
            items: { type: "string" },
            description: "Argv array. No pipes or shell operators.",
          },
        },
      },
    },
  },
];
