function simplifyInlineMath(math: string): string {
  return math.replace(/\\times/g, "×").replace(/\\div/g, "÷").trim();
}

export function preprocessAssistantContent(content: string): string {
  return content
    .replace(/\$([^$]+)\$/g, (_, math: string) => simplifyInlineMath(math))
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷");
}
