import { markdownToSafeHtml, plainTextFromMarkdown } from "@/lib/blog-markdown";

function excerptParagraphs(markdown: string, maxParagraphs: number): string {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .slice(0, maxParagraphs)
    .join("\n\n");
}

export function markdownExcerptHtml(
  body: string,
  maxParagraphs = 2,
): string {
  const excerpt = excerptParagraphs(body, maxParagraphs);
  if (!excerpt) return "";
  return markdownToSafeHtml(excerpt);
}

export function markdownExcerptPlain(
  body: string,
  maxParagraphs = 2,
): string {
  const excerpt = excerptParagraphs(body, maxParagraphs);
  if (!excerpt) return "";
  return plainTextFromMarkdown(excerpt, 2000);
}
