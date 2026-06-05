import { useMemo } from "react";
import { parseMarkdownBlocks, type MarkdownBlock } from "../lib/parseMarkdownBlocks";
import { preprocessAssistantContent } from "../lib/preprocessAssistantContent";
import { renderInlineMarkdown } from "../lib/renderInlineMarkdown";
import { CodeBlock } from "./CodeBlock";

interface MarkdownContentProps {
  content: string;
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.type === "code") {
    return (
      <CodeBlock
        key={index}
        content={block.content}
        language={block.language || undefined}
      />
    );
  }

  if (block.type === "heading") {
    const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
    return (
      <Tag key={index} className={`markdown-heading markdown-heading--${block.level}`}>
        {renderInlineMarkdown(block.text)}
      </Tag>
    );
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag key={index} className="markdown-list">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
        ))}
      </ListTag>
    );
  }

  return (
    <p key={index} className="markdown-paragraph">
      {block.text.split("\n").map((line, lineIndex, lines) => (
        <span key={lineIndex}>
          {renderInlineMarkdown(line)}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const blocks = useMemo(
    () => parseMarkdownBlocks(preprocessAssistantContent(content)),
    [content],
  );

  if (blocks.length === 0) {
    return null;
  }

  return <div className="markdown-content">{blocks.map(renderBlock)}</div>;
}
