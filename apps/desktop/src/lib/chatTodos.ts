const TODO_LINE = /^\s*\/todo\s+(.+)$/i;

export interface ParsedChatTodos {
  todos: string[];
  chatContent: string;
}

export function parseChatTodoCommands(content: string): ParsedChatTodos {
  const todos: string[] = [];
  const chatLines: string[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(TODO_LINE);
    if (match) {
      const text = match[1]?.trim() ?? "";
      if (text) {
        todos.push(text);
      }
      continue;
    }
    chatLines.push(line);
  }

  return {
    todos,
    chatContent: chatLines.join("\n").trim(),
  };
}
