export interface LocalModelOption {
  id: string;
  label: string;
  sizeLabel: string;
  description: string;
  speed: "fastest" | "fast" | "balanced" | "quality";
  contextTokens: number;
  supportsTools?: boolean;
}

export const FASTEST_LOCAL_MODEL = "llama3.2:1b";
export const DEFAULT_LOCAL_MODEL = FASTEST_LOCAL_MODEL;

export const LOCAL_MODEL_CATALOG: LocalModelOption[] = [
  {
    id: "llama3.2:1b",
    label: "Llama 3.2 1B",
    sizeLabel: "~1.3 GB",
    speed: "fastest",
    description: "Fastest option. Best for quick answers and low latency.",
    contextTokens: 128_000,
    supportsTools: false,
  },
  {
    id: "llama3.2:3b",
    label: "Llama 3.2 3B",
    sizeLabel: "~2 GB",
    speed: "fast",
    description: "Very fast with slightly better answers than 1B.",
    contextTokens: 128_000,
    supportsTools: true,
  },
  {
    id: "phi3.5:mini",
    label: "Phi 3.5 Mini",
    sizeLabel: "~2.2 GB",
    speed: "fast",
    description: "Compact and quick, strong at short instructions.",
    contextTokens: 128_000,
    supportsTools: true,
  },
  {
    id: "qwen3.5:4b",
    label: "Qwen 3.5 4B",
    sizeLabel: "~3.4 GB",
    speed: "balanced",
    description: "Balanced speed and quality for everyday tasks.",
    contextTokens: 32_768,
    supportsTools: true,
  },
  {
    id: "gemma4:e4b",
    label: "Gemma 4 E4B",
    sizeLabel: "~9.6 GB",
    speed: "balanced",
    description: "Higher quality, slower downloads and responses.",
    contextTokens: 8192,
    supportsTools: true,
  },
  {
    id: "gemma4:26b",
    label: "Gemma 4 26B",
    sizeLabel: "~18 GB",
    speed: "quality",
    description: "Best quality here, but much slower on local hardware.",
    contextTokens: 8192,
    supportsTools: true,
  },
];

export function findLocalModel(modelId: string): LocalModelOption | undefined {
  return LOCAL_MODEL_CATALOG.find((model) => model.id === modelId);
}

export function getModelContextTokens(modelId: string): number | undefined {
  return findLocalModel(modelId)?.contextTokens;
}

export function formatModelOptionLabel(model: LocalModelOption): string {
  const toolsHint = model.supportsTools ? " · Agent" : "";
  if (model.speed === "fastest") {
    return `${model.label} (${model.sizeLabel}) · Fastest`;
  }
  return `${model.label} (${model.sizeLabel})${toolsHint}`;
}

export function modelSupportsTools(modelId: string): boolean {
  return findLocalModel(modelId)?.supportsTools ?? false;
}
