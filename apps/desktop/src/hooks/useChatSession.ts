import { useCallback, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@deskninja/ai-core";
import { ConversationService } from "@deskninja/ai-core";
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
  service: ConversationService;
  providerId: string;
  selectedModel?: string;
}

export function useChatSession({ service, providerId, selectedModel }: UseChatSessionOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");
  const [metricsByMessageId, setMetricsByMessageId] = useState<Record<string, MessageMetrics>>({});
  const [streamingExcludeIds, setStreamingExcludeIds] = useState<Set<string>>(new Set());
  const streamTimingRef = useRef<StreamTimingState>({
    startedAt: 0,
    firstTokenAt: 0,
    assistantIdsBeforeSend: new Set(),
  });

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const startedAt = performance.now();
      const assistantIdsBeforeSend = collectAssistantIds(service.getState().messages);

      streamTimingRef.current = {
        startedAt,
        firstTokenAt: 0,
        assistantIdsBeforeSend,
      };
      setStreamingExcludeIds(assistantIdsBeforeSend);

      setIsStreaming(true);
      setStreamPhase("thinking");
      service.setProvider(providerId);

      await service.sendMessage({
        content,
        model: providerId === OLLAMA_PROVIDER_ID ? selectedModel : undefined,
        onUpdate: (state) => {
          setMessages([...state.messages]);

          const timing = streamTimingRef.current;
          const activeAssistant = findActiveAssistantMessage(
            state.messages,
            timing.assistantIdsBeforeSend,
          );

          if (activeAssistant?.content && timing.firstTokenAt === 0) {
            timing.firstTokenAt = performance.now();
            setStreamPhase("typing");
          }
        },
      });

      const activeAssistant = findActiveAssistantMessage(
        service.getState().messages,
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
    [providerId, selectedModel, service],
  );

  return useMemo(
    () => ({
      messages,
      isStreaming,
      streamPhase,
      metricsByMessageId,
      sendMessage,
      streamingExcludeIds,
    }),
    [messages, isStreaming, streamPhase, metricsByMessageId, sendMessage, streamingExcludeIds],
  );
}
