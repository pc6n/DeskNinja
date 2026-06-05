import type { ConversationState, SendMessageOptions } from "../conversation/service.js";
import { createMessage, createConversationId } from "../conversation/service.js";
import type { ChatMessage, ChatToolCall } from "../types/chat.js";
import type { StreamEvent } from "../types/stream.js";
import type { ProviderClient } from "../provider/types.js";
import { AGENT_TOOL_DEFINITIONS } from "../tools/schemas.js";
import type { ToolActivity, ToolCallRequest, ToolCallResult, ToolExecutor, ToolName } from "../types/tools.js";
import { FORMATTING_SYSTEM_PROMPT } from "../conversation/prompts.js";

const AGENT_SYSTEM_PROMPT = `${FORMATTING_SYSTEM_PROMPT}

You can use workspace tools to read and list files inside allowed folders (home directory plus user-added paths).
Use tools when the user asks about files, code, or directories. Summarize clearly after gathering context.`;

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

    for (let round = 0; round < maxRounds; round += 1) {
      const roundResult = await this.streamRound(provider, options);
      if (roundResult.toolCalls.length === 0) {
        break;
      }

      for (const call of roundResult.toolCalls) {
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
    }

    this.state = { ...this.state, isStreaming: false };
    options.onUpdate?.(this.state);
    return this.state;
  }

  private async streamRound(
    provider: ProviderClient,
    options: SendAgentMessageOptions,
  ): Promise<{ toolCalls: ChatToolCall[] }> {
    let messageId: string = crypto.randomUUID();
    let content = "";
    let toolCalls: ChatToolCall[] = [];
    let usage = this.state.contextUsage;

    for await (const event of provider.streamMessage({
      messages: withAgentSystemPrompt(this.state.messages),
      model: options.model,
      tools: AGENT_TOOL_DEFINITIONS,
    })) {
      this.state = this.applyStreamEvent(event, messageId);
      options.onUpdate?.(this.state);

      if (event.type === "start") {
        messageId = event.messageId as string;
      }
      if (event.type === "delta") {
        content += event.content;
      }
      if (event.type === "tool_calls") {
        toolCalls = event.toolCalls;
      }
      if (event.type === "done") {
        content = event.message.content;
        toolCalls = event.message.toolCalls ?? toolCalls;
        usage = event.usage ?? usage;
        this.state = { ...this.state, contextUsage: usage };
      }
      if (event.type === "error") {
        break;
      }
    }

    if (toolCalls.length > 0) {
      this.state = this.upsertAssistant(messageId, content, { toolCalls });
      options.onUpdate?.(this.state);
    }

    return { toolCalls };
  }

  private applyStreamEvent(event: StreamEvent, fallbackId: string): ConversationState {
    if (event.type === "start") {
      return this.upsertAssistant(event.messageId, "");
    }
    if (event.type === "delta") {
      const current = this.findAssistant(event.messageId)?.content ?? "";
      return this.upsertAssistant(event.messageId, current + event.content);
    }
    if (event.type === "tool_calls") {
      return this.upsertAssistant(event.messageId, this.findAssistant(event.messageId)?.content ?? "", {
        toolCalls: event.toolCalls,
      });
    }
    if (event.type === "done") {
      return this.upsertAssistant(event.message.id, event.message.content, event.message, event.usage);
    }

    const errorMessage = createMessage("assistant", `Error: ${event.error.message}`);
    return {
      ...this.state,
      messages: [...this.state.messages, errorMessage],
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

function withAgentSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  const withoutSystem = messages.filter((message) => message.role !== "system");
  return [createMessage("system", AGENT_SYSTEM_PROMPT), ...withoutSystem];
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
    ? JSON.stringify(result.output)
    : `Error: ${result.errorMessage ?? "Tool failed"}`;
  const message = createMessage("tool", content);
  message.toolCallId = request.id;
  message.toolName = request.tool;
  return message;
}

function formatToolLabel(request: ToolCallRequest): string {
  const input = request.input;
  if (request.tool === "read_file" && typeof input.path === "string") {
    return `Reading \`${input.path}\`…`;
  }
  if (request.tool === "read_files" && Array.isArray(input.paths)) {
    return `Reading ${input.paths.length} files…`;
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
