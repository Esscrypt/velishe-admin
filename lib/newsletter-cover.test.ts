// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import { isLocalSiteUrl } from "./newsletter-cover";
import { buildNewsletterHtml } from "./newsletter-html";

test("buildNewsletterHtml uses embedded cover cid", () => {
  const html = buildNewsletterHtml({
    title: "Hello",
    teaser: "Teaser",
    body: "Body",
    coverImageSrc: "cid:newsletter-cover@velishe",
    readUrl: "https://example.com/blog/x/",
    unsubscribeUrl: "https://example.com/privacy/",
    isPreview: true,
  });
  expect(html).toContain('src="cid:newsletter-cover@velishe"');
});

test("isLocalSiteUrl detects localhost", () => {
  expect(isLocalSiteUrl("http://localhost:3000")).toBe(true);
  expect(isLocalSiteUrl("https://www.velishemodelmanagement.com")).toBe(false);
});
