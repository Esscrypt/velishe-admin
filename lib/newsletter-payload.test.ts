// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import { buildNewsletterPayload } from "./newsletter-payload";

test("preview subject is prefixed", () => {
  const { subject } = buildNewsletterPayload({
    title: "Hello",
    teaser: "Teaser",
    body: "Body",
    coverImageSrc: null,
    readUrl: "https://example.com/blog/x/",
    unsubscribeUrl: "https://example.com/privacy/",
    isPreview: true,
    subjectPrefix: "[Preview] ",
  });
  expect(subject).toBe("[Preview] Hello");
});
