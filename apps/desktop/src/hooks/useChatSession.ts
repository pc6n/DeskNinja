import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage, TokenUsage, ToolActivity, ToolExecutor } from "@deskninja/ai-core";
import { AgentService, ConversationService } from "@deskninja/ai-core";
import { OLLAMA_PROVIDER_ID } from "@deskninja/model-providers";
import {
  buildMessageMetrics,
  collectAssistantIds,
  findActiveAssistantMessage,
  type MessageMetrics,
  type StreamPhase,
} from "../lib/chatMetrics";

interface StreamTimingState {
  startedAt: number;
  firstTokenAt: number;
  assistantIdsBeforeSend: Set<string>;
}

interface UseChatSessionOptions {
  conversationService: ConversationService;
  agentService: AgentService;
  toolExecutor: ToolExecutor;
  providerId: string;
  selectedModel?: string;
  agentMode: boolean;
}

export function useChatSession({
  conversationService,
  agentService,
  toolExecutor,
  providerId,
  selectedModel,
  agentMode,
}: UseChatSessionOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");
  const [metricsByMessageId, setMetricsByMessageId] = useState<Record<string, MessageMetrics>>({});
  const [streamingExcludeIds, setStreamingExcludeIds] = useState<Set<string>>(new Set());
  const [contextUsage, setContextUsage] = useState<TokenUsage | undefined>();
  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([]);
  const streamTimingRef = useRef<StreamTimingState>({
    startedAt: 0,
    firstTokenAt: 0,
    assistantIdsBeforeSend: new Set(),
  });

  const activeService = agentMode ? agentService : conversationService;

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const startedAt = performance.now();
      const assistantIdsBeforeSend = collectAssistantIds(activeService.getState().messages);

      streamTimingRef.current = {
        startedAt,
        firstTokenAt: 0,
        assistantIdsBeforeSend,
      };
      setStreamingExcludeIds(assistantIdsBeforeSend);
      setToolActivity([]);

      setIsStreaming(true);
      setStreamPhase(agentMode ? "thinking" : "thinking");
      activeService.setProvider(providerId);

      const model = providerId === OLLAMA_PROVIDER_ID ? selectedModel : undefined;
      const onUpdate = (state: { messages: ChatMessage[]; contextUsage?: TokenUsage }) => {
        setMessages([...state.messages]);
        if (state.contextUsage) {
          setContextUsage(state.contextUsage);
        }

        const timing = streamTimingRef.current;
        const activeAssistant = findActiveAssistantMessage(
          state.messages,
          timing.assistantIdsBeforeSend,
        );

        if (activeAssistant?.content && timing.firstTokenAt === 0) {
          timing.firstTokenAt = performance.now();
          setStreamPhase("typing");
        }
      };

      if (agentMode) {
        await agentService.sendMessage({
          content,
          model,
          executor: toolExecutor,
          onUpdate,
          onToolActivity: (activity) => {
            setToolActivity((current) => {
              const withoutTool = current.filter((item) => item.tool !== activity.tool);
              return [...withoutTool, activity];
            });
            if (activity.status === "running") {
              setStreamPhase("thinking");
            }
          },
        });
      } else {
        await conversationService.sendMessage({
          content,
          model,
          onUpdate,
        });
      }

      const activeAssistant = findActiveAssistantMessage(
        activeService.getState().messages,
        assistantIdsBeforeSend,
      );

      if (activeAssistant) {
        const metrics = buildMessageMetrics(
          startedAt,
          streamTimingRef.current.firstTokenAt,
          performance.now(),
        );

        setMetricsByMessageId((current) => ({
          ...current,
          [activeAssistant.id]: metrics,
        }));
      }

      setStreamPhase("idle");
      setIsStreaming(false);
      setStreamingExcludeIds(new Set());
    },
    [
      activeService,
      agentMode,
      agentService,
      conversationService,
      providerId,
      selectedModel,
      toolExecutor,
    ],
  );

  return useMemo(
    () => ({
      messages,
      isStreaming,
      streamPhase,
      metricsByMessageId,
      sendMessage,
      streamingExcludeIds,
      contextUsage,
      toolActivity,
    }),
    [
      messages,
      isStreaming,
      streamPhase,
      metricsByMessageId,
      sendMessage,
      streamingExcludeIds,
      contextUsage,
      toolActivity,
    ],
  );
}
