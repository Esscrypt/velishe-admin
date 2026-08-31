// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import { assertCanSendNewsletter } from "./newsletter-send";

test("blocks unpublished", () => {
  const result = assertCanSendNewsletter(
    { published: false, newsletterSentAt: null },
    3,
  );
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(400);
});

test("blocks already sent", () => {
  const result = assertCanSendNewsletter(
    { published: true, newsletterSentAt: new Date() },
    3,
  );
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(409);
});

test("blocks empty list", () => {
  const result = assertCanSendNewsletter(
    { published: true, newsletterSentAt: null },
    0,
  );
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.status).toBe(400);
});

test("allows published with recipients", () => {
  expect(
    assertCanSendNewsletter({ published: true, newsletterSentAt: null }, 2).ok,
  ).toBe(true);
});
