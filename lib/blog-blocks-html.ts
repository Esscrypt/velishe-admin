import type { BlogBlock } from "@/lib/blog-blocks";
import { excerptBlocks } from "@/lib/blog-blocks";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        result += `<strong>${renderInline(text.slice(i + 2, end))}</strong>`;
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*" || text[i] === "_") {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && end > i + 1) {
        result += `<em>${renderInline(text.slice(i + 1, end))}</em>`;
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          if (/^https?:\/\//i.test(href)) {
            result += `<a href="${escapeHtml(href)}">${renderInline(label)}</a>`;
            i = closeParen + 1;
            continue;
          }
        }
      }
    }
    result += escapeHtml(text[i]);
    i += 1;
  }
  return result;
}


export function blockToHtml(block: BlogBlock): string {
  if (block.type === "paragraph") {
    const lines = block.text.split("\n").filter((line) => line.length > 0);
    if (lines.length === 0) return "";
    return lines
      .map((line) => `<p>${renderInline(line)}</p>`)
      .join("");
  }
  if (block.type === "heading") {
    const tag = block.level === 2 ? "h2" : "h3";
    return `<${tag}>${renderInline(block.text)}</${tag}>`;
  }
  if (block.type === "quote") {
    return `<blockquote><p>${renderInline(block.text)}</p></blockquote>`;
  }
  return "";
}

export function blocksToHtml(blocks: BlogBlock[]): string {
  return blocks.map((block) => blockToHtml(block)).join("");
}

export function blocksExcerptToHtml(
  blocks: BlogBlock[],
  maxParagraphs = 2,
): string {
  return blocksToHtml(excerptBlocks(blocks, maxParagraphs));
}
