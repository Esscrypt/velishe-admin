// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import { markdownToSafeHtml } from "./blog-markdown";

test("markdownToSafeHtml escapes script tags", () => {
  const html = markdownToSafeHtml("<script>alert(1)</script>");
  expect(html).not.toContain("<script>");
});
