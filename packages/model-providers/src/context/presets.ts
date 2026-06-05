import type { OllamaChatMessage } from "../ollama/types.js";

export type ContextActionId =
  | "rephrase"
  | "improve"
  | "shorten"
  | "expand"
  | "custom";

export interface ContextActionDefinition {
  id: ContextActionId;
  label: string;
  description: string;
  systemPrompt: string;
}

export const CONTEXT_ACTIONS: ContextActionDefinition[] = [
  {
    id: "rephrase",
    label: "Rephrase",
    description: "Clearer wording, same meaning",
    systemPrompt:
      "Rephrase the user's text clearly and naturally. Keep the same language and meaning. Reply with only the rewritten text.",
  },
  {
    id: "improve",
    label: "Improve",
    description: "Grammar, style, and flow",
    systemPrompt:
      "Improve grammar, style, and flow. Keep the same language and intent. Reply with only the improved text.",
  },
  {
    id: "shorten",
    label: "Shorten",
    description: "Make it more concise",
    systemPrompt:
      "Make the text shorter while keeping essential meaning. Reply with only the shortened text.",
  },
  {
    id: "expand",
    label: "Expand",
    description: "Add useful detail",
    systemPrompt:
      "Expand the text with useful detail while staying on topic. Reply with only the expanded text.",
  },
  {
    id: "custom",
    label: "Custom prompt",
    description: "Your instruction + selection",
    systemPrompt:
      "Follow the user's instruction on the provided text. Reply with only the result text, no commentary.",
  },
];

export function findContextAction(id: ContextActionId): ContextActionDefinition | undefined {
  return CONTEXT_ACTIONS.find((action) => action.id === id);
}

export function buildContextMessages(
  actionId: ContextActionId,
  selection: string,
  customPrompt?: string,
): OllamaChatMessage[] {
  const action = findContextAction(actionId);
  if (!action) {
    throw new Error(`Unknown context action: ${actionId}`);
  }
  const userInstruction =
    actionId === "custom" && customPrompt?.trim()
      ? customPrompt.trim()
      : "Apply the task to the text below.";
  return [
    { role: "system", content: action.systemPrompt },
    {
      role: "user",
      content: `${userInstruction}\n\n---\n\n${selection}`,
    },
  ];
}
