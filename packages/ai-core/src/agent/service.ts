import type { ConversationState, SendMessageOptions } from "../conversation/service.js";
import { createMessage, createConversationId } from "../conversation/service.js";
import type { ChatMessage, ChatToolCall } from "../types/chat.js";
import type { ProviderClient } from "../provider/types.js";
import { AGENT_TOOL_DEFINITIONS } from "../tools/schemas.js";
import type { ToolActivity, ToolCallRequest, ToolCallResult, ToolExecutor, ToolName } from "../types/tools.js";
import { FORMATTING_SYSTEM_PROMPT } from "../conversation/prompts.js";
import { parseTextToolCalls } from "./parseToolCalls.js";
import { bootstrapToolsFromMessage } from "./pathBootstrap.js";

const AGENT_SYSTEM_PROMPT = `${FORMATTING_SYSTEM_PROMPT}

You are a file-reading assistant with tools: explore_repo, list_dir, read_file, read_files, run_readonly_cmd.
Rules:
- To read a file path the user gives: call read_file with that exact path.
- To understand a repo: call explore_repo on the repo root, then read_files on the most important paths returned.
- Never use ls/cat/head for file contents — use read_file or read_files.
- Never print JSON or describe tool calls in prose.
- Only state facts from tool results. After reading, summarize in plain language.`;

export interface SendAgentMessageOptions extends SendMessageOptions {
  executor: ToolExecutor;
  maxToolRounds?: number;
  onToolActivity?: (activity: ToolActivity) => void;
}

export class AgentService {
  private state: ConversationState;

  constructor(
    private readonly registry: { get(id: string): ProviderClient | undefined },
    providerId: string,
  ) {
    this.state = {
      id: createConversationId(),
      messages: [],
      activeProviderId: providerId,
      isStreaming: false,
    };
  }

  getState(): Readonly<ConversationState> {
    return this.state;
  }

  setProvider(providerId: string): void {
    this.state = { ...this.state, activeProviderId: providerId };
  }

  async sendMessage(options: SendAgentMessageOptions): Promise<ConversationState> {
    const provider = this.requireProvider();
    const userMessage = createMessage("user", options.content);
    const maxRounds = options.maxToolRounds ?? 8;

    this.state = {
      ...this.state,
      messages: [...this.state.messages, userMessage],
      isStreaming: true,
    };
    options.onUpdate?.(this.state);

    let executedTools = false;
    for (const call of bootstrapToolsFromMessage(options.content)) {
      executedTools = true;
      await this.runToolCall(toBootstrapCall(call), options);
    }

    for (let round = 0; round < maxRounds; round += 1) {
      const roundResult = await this.streamRound(provider, options);
      if (roundResult.toolCalls.length === 0) {
        break;
      }

      executedTools = true;
      for (const call of roundResult.toolCalls) {
        await this.runToolCall(call, options);
      }
    }

    if (executedTools && !hasVisibleAssistantReply(this.state.messages)) {
      await this.streamRound(provider, options);
    }

    this.state = { ...this.state, isStreaming: false };
    options.onUpdate?.(this.state);
    return this.state;
  }

  private async runToolCall(call: ChatToolCall, options: SendAgentMessageOptions): Promise<void> {
    const request = toToolRequest(call);
    options.onToolActivity?.({
      tool: request.tool,
      label: formatToolLabel(request),
      status: "running",
    });

    const result = await options.executor.execute(request);
    const toolMessage = createToolMessage(request, result);
    this.state = {
      ...this.state,
      messages: [...this.state.messages, toolMessage],
    };
    options.onUpdate?.(this.state);
    options.onToolActivity?.({
      tool: request.tool,
      label: formatToolLabel(request),
      status: result.success ? "done" : "error",
    });
  }

  private async streamRound(
    provider: ProviderClient,
    options: SendAgentMessageOptions,
  ): Promise<{ toolCalls: ChatToolCall[] }> {
    let messageId: string = crypto.randomUUID();
    let content = "";
    let toolCalls: ChatToolCall[] = [];
    let usage = this.state.contextUsage;
    let streamToUi = true;

    for await (const event of provider.streamMessage({
      messages: withAgentSystemPrompt(this.state.messages),
      model: options.model,
      tools: AGENT_TOOL_DEFINITIONS,
    })) {
      if (event.type === "start") {
        messageId = event.messageId as string;
        if (streamToUi) {
          this.state = this.upsertAssistant(messageId, "");
          options.onUpdate?.(this.state);
        }
        continue;
      }

      if (event.type === "tool_calls") {
        toolCalls = event.toolCalls;
        content = "";
        streamToUi = false;
        continue;
      }

      if (event.type === "delta") {
        content += event.content;
        if (streamToUi && toolCalls.length === 0) {
          this.state = this.appendAssistantDelta(messageId, event.content);
          options.onUpdate?.(this.state);
        }
        continue;
      }

      if (event.type === "done") {
        toolCalls = event.message.toolCalls ?? toolCalls;
        if (toolCalls.length > 0) {
          content = "";
          streamToUi = false;
        } else {
          content = event.message.content || content;
        }
        usage = event.usage ?? usage;
        continue;
      }

      if (event.type === "error") {
        this.state = this.appendErrorMessage(event.error.message);
        options.onUpdate?.(this.state);
        break;
      }
    }

    if (toolCalls.length === 0 && content.trim()) {
      toolCalls = parseTextToolCalls(content);
      if (toolCalls.length > 0) {
        streamToUi = false;
        content = "";
      }
    }

    if (toolCalls.length > 0) {
      this.state = this.upsertAssistant(messageId, "", { toolCalls });
    } else if (content.trim()) {
      this.state = this.upsertAssistant(messageId, content, undefined, usage);
    } else {
      this.state = { ...this.state, contextUsage: usage ?? this.state.contextUsage };
    }
    options.onUpdate?.(this.state);
    return { toolCalls };
  }

  private appendAssistantDelta(messageId: string, delta: string): ConversationState {
    const current = this.findAssistant(messageId)?.content ?? "";
    return this.upsertAssistant(messageId, current + delta);
  }

  private appendErrorMessage(message: string): ConversationState {
    return {
      ...this.state,
      messages: [...this.state.messages, createMessage("assistant", `Error: ${message}`)],
      isStreaming: false,
    };
  }

  private requireProvider(): ProviderClient {
    const provider = this.registry.get(this.state.activeProviderId);
    if (!provider) {
      throw new Error(`Provider not found: ${this.state.activeProviderId}`);
    }
    return provider;
  }

  private findAssistant(messageId: string): ChatMessage | undefined {
    return this.state.messages.find((message) => message.id === messageId);
  }

  private upsertAssistant(
    messageId: string,
    content: string,
    patch?: Partial<ChatMessage>,
    usage?: ConversationState["contextUsage"],
  ): ConversationState {
    const existing = this.findAssistant(messageId);
    const nextMessage: ChatMessage = {
      id: messageId,
      role: "assistant",
      content,
      createdAt: existing?.createdAt ?? new Date(),
      toolCalls: patch?.toolCalls ?? existing?.toolCalls,
      toolCallId: patch?.toolCallId ?? existing?.toolCallId,
      toolName: patch?.toolName ?? existing?.toolName,
      ...patch,
    };

    const hasMessage = this.state.messages.some((message) => message.id === messageId);
    const messages = hasMessage
      ? this.state.messages.map((message) => (message.id === messageId ? nextMessage : message))
      : [...this.state.messages, nextMessage];

    return {
      ...this.state,
      messages,
      contextUsage: usage ?? this.state.contextUsage,
    };
  }
}

function hasVisibleAssistantReply(messages: ChatMessage[]): boolean {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "assistant") {
      continue;
    }
    if ((message.toolCalls?.length ?? 0) > 0) {
      continue;
    }
    return message.content.trim().length > 0;
  }
  return false;
}

function withAgentSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  const withoutSystem = messages.filter((message) => message.role !== "system");
  return [createMessage("system", AGENT_SYSTEM_PROMPT), ...withoutSystem];
}

function toBootstrapCall(request: ToolCallRequest): ChatToolCall {
  return {
    id: request.id,
    name: request.tool,
    arguments: request.input,
  };
}

function toToolRequest(call: ChatToolCall): ToolCallRequest {
  return {
    id: call.id,
    tool: call.name as ToolName,
    input: call.arguments,
  };
}

function createToolMessage(request: ToolCallRequest, result: ToolCallResult): ChatMessage {
  const content = result.success
    ? formatToolResult(request.tool, result.output)
    : `Error: ${result.errorMessage ?? "Tool failed"}`;
  const message = createMessage("tool", content);
  message.toolCallId = request.id;
  message.toolName = request.tool;
  return message;
}

function formatToolResult(tool: ToolName, output: Record<string, unknown>): string {
  if (tool === "list_dir" && Array.isArray(output.entries)) {
    const truncated = output.truncated === true;
    const lines = output.entries.map((entry) => formatDirEntry(entry));
    const body = lines.filter(Boolean).join("\n") || "(empty directory)";
    return truncated ? `${body}\n\n[listing truncated]` : body;
  }

  if (tool === "read_files" && Array.isArray(output.files)) {
    return output.files.map((file) => formatFileEntry(file)).filter(Boolean).join("\n\n");
  }

  if (tool === "read_file") {
    return formatFileEntry(output);
  }

  if (tool === "explore_repo" && Array.isArray(output.files)) {
    const root = typeof output.root === "string" ? output.root : "repo";
    const files = output.files.map((file) => (typeof file === "string" ? file : "")).filter(Boolean);
    const truncated = output.truncated === true;
    const header = `Core files under ${root} (${files.length}):`;
    const body = files.join("\n");
    return truncated ? `${header}\n${body}\n\n[listing truncated]` : `${header}\n${body}`;
  }

  return JSON.stringify(output);
}

function formatDirEntry(entry: unknown): string {
  if (!entry || typeof entry !== "object") {
    return "";
  }
  const record = entry as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name : "?";
  const path = typeof record.path === "string" ? record.path : "";
  const kind = record.isDir === true ? "dir" : "file";
  return `${name} (${kind})${path ? `: ${path}` : ""}`;
}

function formatFileEntry(file: unknown): string {
  if (!file || typeof file !== "object") {
    return "";
  }
  const record = file as Record<string, unknown>;
  const path = typeof record.path === "string" ? record.path : "file";
  const error = typeof record.error === "string" ? record.error : "";
  if (error) {
    return `--- ${path} ---\nError: ${error}`;
  }
  const content = typeof record.content === "string" ? record.content : "";
  return `--- ${path} ---\n${content}`;
}

function formatToolLabel(request: ToolCallRequest): string {
  const input = request.input;
  if (request.tool === "read_file" && typeof input.path === "string") {
    return `Reading \`${input.path}\`…`;
  }
  if (request.tool === "read_files" && Array.isArray(input.paths)) {
    return `Reading ${input.paths.length} files…`;
  }
  if (request.tool === "explore_repo" && typeof input.path === "string") {
    return `Exploring repo \`${input.path}\`…`;
  }
  if (request.tool === "list_dir" && typeof input.path === "string") {
    const glob = typeof input.glob === "string" ? ` (${input.glob})` : "";
    return `Listing \`${input.path}\`${glob}…`;
  }
  if (request.tool === "run_readonly_cmd" && typeof input.cmd === "string") {
    const args = Array.isArray(input.args) ? input.args.join(" ") : "";
    return `Running \`${`${input.cmd} ${args}`.trim()}\`…`;
  }
  return `Running ${request.tool}…`;
}
