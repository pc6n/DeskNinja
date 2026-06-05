import { useState } from "react";

interface CodeBlockProps {
  content: string;
  language?: string;
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 2.5A1.5 1.5 0 0 1 5.5 1h5A1.5 1.5 0 0 1 12 2.5V11H5.5A1.5 1.5 0 0 1 4 9.5V2.5Zm1.5-.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5H11V2.5a.5.5 0 0 0-.5-.5h-5ZM6 4.5A1.5 1.5 0 0 1 7.5 3h5A1.5 1.5 0 0 1 14 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 6 13.5v-9Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.2 4.2a.75.75 0 0 1 1 1.05l-5.5 6.5a.75.75 0 0 1-1.08.03l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.98-5.9a.75.75 0 0 1 1.05-.09Z"
      />
    </svg>
  );
}

export function CodeBlock({ content, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await copyText(content.trimEnd());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="markdown-code">
      <div className="markdown-code-header">
        <span className="markdown-code-lang">{language || "code"}</span>
        <button
          type="button"
          className="markdown-code-copy"
          onClick={() => void handleCopy()}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <pre className="markdown-code-block">
        <code>{content}</code>
      </pre>
    </div>
  );
}
