function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripRawHtml(source: string): string {
  return source.replace(/<[^>]+>/g, "");
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

function flushParagraph(lines: string[]): string {
  if (lines.length === 0) return "";
  return `<p>${renderInline(lines.join(" "))}</p>`;
}

export function markdownToSafeHtml(markdown: string): string {
  const cleaned = stripRawHtml(markdown).replace(/\r\n/g, "\n");
  const lines = cleaned.split("\n");
  const parts: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    const tag = listType;
    parts.push(
      `<${tag}>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`,
    );
    listType = null;
    listItems = [];
  };

  const flushParagraphBuffer = () => {
    const html = flushParagraph(paragraph);
    if (html) parts.push(html);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      flushParagraphBuffer();
      continue;
    }

    const headingMatch = /^(#{2,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushList();
      flushParagraphBuffer();
      const level = headingMatch[1].length;
      parts.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushList();
      flushParagraphBuffer();
      parts.push(`<blockquote><p>${renderInline(trimmed.slice(2))}</p></blockquote>`);
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (unorderedMatch) {
      flushParagraphBuffer();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (orderedMatch) {
      flushParagraphBuffer();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushList();
  flushParagraphBuffer();
  return parts.join("");
}

export function plainTextFromMarkdown(markdown: string, maxLen = 160): string {
  const text = stripRawHtml(markdown)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_]([^*_]+)[*_]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trimEnd()}…`;
}
