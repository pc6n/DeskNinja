export type MarkdownBlock =
  | { type: "code"; language: string; content: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

type Segment = { type: "text"; content: string } | { type: "code"; language: string; content: string };

function splitCodeFences(content: string): Segment[] {
  const parts = content.split("```");
  const segments: Segment[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    if (index % 2 === 0) {
      if (part) {
        segments.push({ type: "text", content: part });
      }
      continue;
    }

    const newline = part.indexOf("\n");
    const language = newline >= 0 ? part.slice(0, newline).trim() : "";
    const code = newline >= 0 ? part.slice(newline + 1) : part;
    segments.push({ type: "code", language, content: code });
  }

  return segments;
}

function parseParagraph(paragraph: string): MarkdownBlock[] {
  const trimmed = paragraph.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split("\n");
  if (lines.every((line) => /^[-*•]\s+/.test(line))) {
    return [{
      type: "list",
      ordered: false,
      items: lines.map((line) => line.replace(/^[-*•]\s+/, "").trim()),
    }];
  }

  if (lines.every((line) => /^\d+\.\s+/.test(line))) {
    return [{
      type: "list",
      ordered: true,
      items: lines.map((line) => line.replace(/^\d+\.\s+/, "").trim()),
    }];
  }

  const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
  const headingLevel = heading?.[1]?.length;
  if (heading?.[2] && headingLevel && lines.length === 1) {
    return [{
      type: "heading",
      level: headingLevel as 1 | 2 | 3,
      text: heading[2].trim(),
    }];
  }

  return [{ type: "paragraph", text: trimmed }];
}

function parseTextBlock(text: string): MarkdownBlock[] {
  return text
    .split(/\n{2,}/)
    .flatMap((paragraph) => parseParagraph(paragraph));
}

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  return splitCodeFences(content).flatMap((segment) => {
    if (segment.type === "code") {
      return [{ type: "code", language: segment.language, content: segment.content }];
    }
    return parseTextBlock(segment.content);
  });
}
