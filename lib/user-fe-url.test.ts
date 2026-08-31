// @ts-expect-error bun:test
import { test, expect } from "bun:test";
import {
  getUserFeUrl,
  isAllowedUserFeUrl,
  normalizeSiteUrl,
} from "./user-fe-url";

test("normalizeSiteUrl strips trailing slash", () => {
  expect(normalizeSiteUrl("https://example.com/")).toBe("https://example.com");
});

test("isAllowedUserFeUrl allows vercel previews", () => {
  expect(
    isAllowedUserFeUrl(
      "https://velishe-git-feat-blog-and-mailing-list-me-mikirovxyzs-projects.vercel.app",
    ),
  ).toBe(true);
});

test("getUserFeUrl prefers override", () => {
  expect(
    getUserFeUrl("https://velishe-git-feat-blog-and-mailing-list.vercel.app"),
  ).toBe("https://velishe-git-feat-blog-and-mailing-list.vercel.app");
});
