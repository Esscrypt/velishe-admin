// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import { markdownExcerptHtml, markdownExcerptPlain } from "./newsletter-excerpt";

test("markdownExcerptHtml takes first two paragraphs", () => {
  const html = markdownExcerptHtml("Para one.\n\nPara two.\n\nPara three.");
  expect(html).toContain("Para one");
  expect(html).toContain("Para two");
  expect(html).not.toContain("Para three");
});

test("markdownExcerptPlain strips markdown", () => {
  const text = markdownExcerptPlain("**Bold** intro.\n\nSecond.");
  expect(text).toContain("Bold intro");
  expect(text).toContain("Second");
});
