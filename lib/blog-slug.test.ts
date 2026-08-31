// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import { slugifyTitle, uniqueSlug } from "./blog-slug";

test("slugifyTitle lowercases and hyphenates", () => {
  expect(slugifyTitle("Casting Notes from Paris!")).toBe("casting-notes-from-paris");
});

test("uniqueSlug appends -2 on collision", () => {
  expect(uniqueSlug("hello", ["hello"])).toBe("hello-2");
});
