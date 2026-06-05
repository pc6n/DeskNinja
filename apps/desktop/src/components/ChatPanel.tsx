import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@deskninja/ai-core";
import type { MessageMetrics, StreamPhase } from "../lib/chatMetrics";
import { getLatestAssistantMessage } from "../lib/chatMetrics";
import { MarkdownContent } from "./MarkdownContent";
import {
  getStreamUiState,
  MessageMetricsFooter,
  ThinkingIndicator,
  TypingCursor,
} from "./ChatStatus";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamPhase: StreamPhase;
  metricsByMessageId: Record<string, MessageMetrics>;
  streamingExcludeIds: Set<string>;
  modelLabel?: string;
  onSend: (content: string) => Promise<void>;
}

export function ChatPanel({
  messages,
  isStreaming,
  streamPhase,
  metricsByMessageId,
  streamingExcludeIds,
  modelLabel,
  onSend,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const latestAssistant = getLatestAssistantMessage(
    messages,
    isStreaming ? streamingExcludeIds : new Set(),
  );
  const { showThinking, showTypingCursor } = getStreamUiState(
    isStreaming,
    streamPhase,
    latestAssistant?.content,
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming, streamPhase]);

  async function submitDraft(): Promise<void> {
    const content = draft.trim();
    if (!content || isStreaming) {
      return;
    }
    setDraft("");
    await onSend(content);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await submitDraft();
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitDraft();
    }
  }

  return (
    <section className="chat-panel" aria-label="Chat">
      <div className="message-list" ref={listRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="empty-state">
            {modelLabel
              ? `Local model ${modelLabel} is ready. Ask anything.`
              : "Ask anything to get started."}
          </p>
        ) : (
          messages
            .filter(
              (message) =>
                !(message.role === "assistant" && message.content.length === 0 && showThinking),
            )
            .map((message, index, visibleMessages) => {
            const isLatestAssistant =
              message.role === "assistant" &&
              index === visibleMessages.length - 1 &&
              !showThinking;
            const showCursor = isLatestAssistant && showTypingCursor;

            return (
              <article key={message.id} className={`message message-${message.role}`}>
                <header>{message.role}</header>
                <div className={`message-body${message.role === "user" ? " message-body--plain" : ""}`}>
                  {message.role === "assistant" ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    message.content
                  )}
                  {showCursor ? <TypingCursor visible /> : null}
                </div>
                {message.role === "assistant" ? (
                  <MessageMetricsFooter metrics={metricsByMessageId[message.id]} />
                ) : null}
              </article>
            );
          })
        )}
        <ThinkingIndicator visible={showThinking} />
      </div>
      <form className="composer" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Message… /todo Buy milk to add a todo, Enter to send"
          rows={2}
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || draft.trim().length === 0}>
          {isStreaming ? (streamPhase === "thinking" ? "Thinking..." : "Typing...") : "Send"}
        </button>
      </form>
    </section>
  );
}
