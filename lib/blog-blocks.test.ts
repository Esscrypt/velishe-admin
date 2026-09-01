// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import {
  blocksHaveContent,
  ensureBlocksBody,
  excerptBlocks,
  isBlocksDocument,
  markdownToBlocks,
  parseBlocksDocument,
  plainTextFromBlocks,
  serializeBlocksDocument,
} from "./blog-blocks";

test("markdownToBlocks splits paragraphs and headings", () => {
  const blocks = markdownToBlocks("## Intro\n\nFirst paragraph.\n\nSecond.");
  expect(blocks[0]).toMatchObject({ type: "heading", level: 2, text: "Intro" });
  expect(blocks[1]).toMatchObject({ type: "paragraph", text: "First paragraph." });
  expect(blocks[2]).toMatchObject({ type: "paragraph", text: "Second." });
});

test("serialize and parse round-trip", () => {
  const blocks = markdownToBlocks("Hello **world**");
  const body = serializeBlocksDocument(blocks);
  expect(isBlocksDocument(body)).toBe(true);
  const parsed = parseBlocksDocument(body);
  expect(parsed?.blocks[0]).toMatchObject({ type: "paragraph", text: "Hello **world**" });
});

test("plainTextFromBlocks skips media blocks", () => {
  const text = plainTextFromBlocks([
    { id: "1", type: "paragraph", text: "Opening line." },
    { id: "2", type: "media", mediaId: "img-1", layout: "full" },
    { id: "3", type: "paragraph", text: "Closing line." },
  ]);
  expect(text).toBe("Opening line. Closing line.");
});

test("ensureBlocksBody converts legacy markdown", () => {
  const body = ensureBlocksBody("# Title\n\nBody copy.");
  expect(isBlocksDocument(body)).toBe(true);
  expect(parseBlocksDocument(body)?.blocks).toHaveLength(2);
});

test("excerptBlocks keeps first paragraphs only", () => {
  const excerpt = excerptBlocks(
    markdownToBlocks("One.\n\nTwo.\n\nThree."),
    2,
  );
  expect(excerpt).toHaveLength(2);
});

test("blocksHaveContent detects empty document", () => {
  expect(
    blocksHaveContent([{ id: "1", type: "paragraph", text: "   " }]),
  ).toBe(false);
  expect(
    blocksHaveContent([{ id: "1", type: "media", mediaId: "x", layout: "full" }]),
  ).toBe(true);
});
