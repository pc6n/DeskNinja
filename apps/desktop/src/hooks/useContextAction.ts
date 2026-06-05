import { useCallback, useState } from "react";
import {
  buildContextMessages,
  type ContextActionId,
} from "@deskninja/model-providers";
import { createDesktopOllamaTransport } from "../lib/tauriOllamaTransport";

export function useContextAction(model: string) {
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAction = useCallback(
    async (actionId: ContextActionId, selection: string, customPrompt?: string) => {
      setError(null);
      setResult("");
      setIsStreaming(true);
      try {
        const messages = buildContextMessages(actionId, selection, customPrompt);
        const transport = createDesktopOllamaTransport();
        let output = "";
        for await (const chunk of transport.chatStream(model, messages)) {
          output += chunk;
          setResult(output);
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Action failed.");
      } finally {
        setIsStreaming(false);
      }
    },
    [model],
  );

  function reset(): void {
    setResult("");
    setError(null);
  }

  return { result, isStreaming, error, runAction, reset };
}
