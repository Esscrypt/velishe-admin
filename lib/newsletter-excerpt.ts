import { markdownToSafeHtml, plainTextFromMarkdown } from "@/lib/blog-markdown";
import {
  isBlocksDocument,
  parseBlocksDocument,
  plainTextFromBody,
} from "@/lib/blog-blocks";
import { blocksExcerptToHtml } from "@/lib/blog-blocks-html";

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
  if (isBlocksDocument(body)) {
    const doc = parseBlocksDocument(body);
    if (!doc) return "";
    return blocksExcerptToHtml(doc.blocks, maxParagraphs);
  }
  const excerpt = excerptParagraphs(body, maxParagraphs);
  if (!excerpt) return "";
  return markdownToSafeHtml(excerpt);
}

export function markdownExcerptPlain(
  body: string,
  maxParagraphs = 2,
): string {
  if (isBlocksDocument(body)) {
    return plainTextFromBody(body, 2000);
  }
  const excerpt = excerptParagraphs(body, maxParagraphs);
  if (!excerpt) return "";
  return plainTextFromMarkdown(excerpt, 2000);
}
