import { plainTextFromMarkdown } from "@/lib/blog-markdown";

export const BLOG_BLOCKS_VERSION = 1;

export type BlogMediaLayout = "full" | "left" | "right";

export type BlogParagraphBlock = {
  id: string;
  type: "paragraph";
  text: string;
};

export type BlogHeadingBlock = {
  id: string;
  type: "heading";
  level: 2 | 3;
  text: string;
};

export type BlogMediaBlock = {
  id: string;
  type: "media";
  mediaId: string;
  layout: BlogMediaLayout;
};

export type BlogQuoteBlock = {
  id: string;
  type: "quote";
  text: string;
};

export type BlogBlock =
  | BlogParagraphBlock
  | BlogHeadingBlock
  | BlogMediaBlock
  | BlogQuoteBlock;

export type BlogBlocksDocument = {
  format: "blocks";
  version: number;
  blocks: BlogBlock[];
};

export function newBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyParagraphBlock(): BlogParagraphBlock {
  return { id: newBlockId(), type: "paragraph", text: "" };
}

export function isBlocksDocument(body: string): boolean {
  const trimmed = body.trimStart();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed) as Partial<BlogBlocksDocument>;
    return parsed.format === "blocks" && Array.isArray(parsed.blocks);
  } catch {
    return false;
  }
}

function normalizeBlock(raw: unknown): BlogBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const block = raw as Record<string, unknown>;
  const id = typeof block.id === "string" && block.id ? block.id : newBlockId();

  if (block.type === "paragraph" && typeof block.text === "string") {
    return { id, type: "paragraph", text: block.text };
  }
  if (
    block.type === "heading" &&
    typeof block.text === "string" &&
    (block.level === 2 || block.level === 3)
  ) {
    return { id, type: "heading", level: block.level, text: block.text };
  }
  if (
    block.type === "media" &&
    typeof block.mediaId === "string" &&
    block.mediaId &&
    (block.layout === "full" ||
      block.layout === "left" ||
      block.layout === "right")
  ) {
    return {
      id,
      type: "media",
      mediaId: block.mediaId,
      layout: block.layout,
    };
  }
  if (block.type === "quote" && typeof block.text === "string") {
    return { id, type: "quote", text: block.text };
  }
  return null;
}

export function parseBlocksDocument(body: string): BlogBlocksDocument | null {
  if (!isBlocksDocument(body)) return null;
  try {
    const parsed = JSON.parse(body.trim()) as BlogBlocksDocument;
    const blocks = parsed.blocks
      .map((block) => normalizeBlock(block))
      .filter((block): block is BlogBlock => block !== null);
    return {
      format: "blocks",
      version: BLOG_BLOCKS_VERSION,
      blocks: blocks.length > 0 ? blocks : [createEmptyParagraphBlock()],
    };
  } catch {
    return null;
  }
}

export function serializeBlocksDocument(blocks: BlogBlock[]): string {
  return JSON.stringify({
    format: "blocks",
    version: BLOG_BLOCKS_VERSION,
    blocks,
  } satisfies BlogBlocksDocument);
}

export function blocksHaveContent(blocks: BlogBlock[]): boolean {
  return blocks.some((block) => {
    if (block.type === "media") return Boolean(block.mediaId);
    return block.text.trim().length > 0;
  });
}

export function bodyHasContent(body: string): boolean {
  if (!body.trim()) return false;
  if (isBlocksDocument(body)) {
    const doc = parseBlocksDocument(body);
    return doc ? blocksHaveContent(doc.blocks) : false;
  }
  return body.trim().length > 0;
}

export function plainTextFromBlocks(blocks: BlogBlock[], maxLen = 160): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "media") continue;
    const text = block.text.trim();
    if (text) parts.push(text);
  }
  const joined = parts.join(" ");
  if (joined.length <= maxLen) return joined;
  const slice = joined.slice(0, maxLen - 1).trimEnd();
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed =
    lastSpace > Math.floor(maxLen * 0.6)
      ? slice.slice(0, lastSpace).trimEnd()
      : slice;
  return `${trimmed}…`;
}

export function excerptBlocks(
  blocks: BlogBlock[],
  maxParagraphs = 2,
): BlogBlock[] {
  const excerpt: BlogBlock[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "quote") {
      if (!block.text.trim()) continue;
      excerpt.push(block);
      if (excerpt.length >= maxParagraphs) break;
    }
  }
  return excerpt;
}

export function markdownToBlocks(markdown: string): BlogBlock[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [createEmptyParagraphBlock()];

  const blocks: BlogBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      id: newBlockId(),
      type: "paragraph",
      text: paragraph.join("\n"),
    });
    paragraph = [];
  };

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      flushParagraph();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length <= 2 ? 2 : 3;
      blocks.push({
        id: newBlockId(),
        type: "heading",
        level,
        text: headingMatch[2],
      });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      blocks.push({
        id: newBlockId(),
        type: "quote",
        text: trimmed.slice(2),
      });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return blocks.length > 0 ? blocks : [createEmptyParagraphBlock()];
}

export function ensureBlocksBody(body: string): string {
  if (isBlocksDocument(body)) {
    const doc = parseBlocksDocument(body);
    return doc ? serializeBlocksDocument(doc.blocks) : serializeBlocksDocument([createEmptyParagraphBlock()]);
  }
  return serializeBlocksDocument(markdownToBlocks(body));
}

export function plainTextFromBody(body: string, maxLen = 160): string {
  if (isBlocksDocument(body)) {
    const doc = parseBlocksDocument(body);
    if (!doc) return "";
    return plainTextFromBlocks(doc.blocks, maxLen);
  }
  return plainTextFromMarkdown(body, maxLen);
}
