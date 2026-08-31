import { describe, expect, test } from "bun:test";
import { assertBlogMediaFields } from "./blog-media";

describe("assertBlogMediaFields", () => {
  test("image requires data and null video fields", () => {
    expect(
      assertBlogMediaFields({
        kind: "image",
        data: "data:image/webp;base64,xx",
        videoUrl: null,
        videoProvider: null,
      }).ok,
    ).toBe(true);
    expect(
      assertBlogMediaFields({
        kind: "image",
        data: null,
        videoUrl: null,
        videoProvider: null,
      }).ok,
    ).toBe(false);
  });

  test("video requires url+provider; data optional", () => {
    expect(
      assertBlogMediaFields({
        kind: "video",
        data: null,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoProvider: "youtube",
      }).ok,
    ).toBe(true);
    expect(
      assertBlogMediaFields({
        kind: "video",
        data: "data:image/webp;base64,xx",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoProvider: "youtube",
      }).ok,
    ).toBe(true);
    expect(
      assertBlogMediaFields({
        kind: "video",
        data: null,
        videoUrl: null,
        videoProvider: "youtube",
      }).ok,
    ).toBe(false);
  });
});
