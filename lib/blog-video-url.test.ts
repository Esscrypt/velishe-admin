import { describe, expect, test } from "bun:test";
import { parseBlogVideoUrl } from "./blog-video-url";

describe("parseBlogVideoUrl", () => {
  test("parses youtube watch", () => {
    const parsed = parseBlogVideoUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(parsed?.provider).toBe("youtube");
    expect(parsed?.providerId).toBe("dQw4w9WgXcQ");
    expect(parsed?.embedUrl).toContain(
      "youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  test("parses youtu.be and shorts", () => {
    expect(parseBlogVideoUrl("https://youtu.be/dQw4w9WgXcQ")?.providerId).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      parseBlogVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")
        ?.providerId,
    ).toBe("dQw4w9WgXcQ");
  });

  test("parses vimeo", () => {
    const parsed = parseBlogVideoUrl("https://vimeo.com/123456789");
    expect(parsed?.provider).toBe("vimeo");
    expect(parsed?.providerId).toBe("123456789");
    expect(parsed?.embedUrl).toBe("https://player.vimeo.com/video/123456789");
  });

  test("parses instagram p/reel/tv", () => {
    expect(
      parseBlogVideoUrl("https://www.instagram.com/p/DblLua6tURF/")?.provider,
    ).toBe("instagram");
    expect(
      parseBlogVideoUrl("https://www.instagram.com/reel/DblLua6tURF/")
        ?.providerId,
    ).toBe("DblLua6tURF");
    expect(
      parseBlogVideoUrl("https://www.instagram.com/tv/DblLua6tURF/")?.provider,
    ).toBe("instagram");
  });

  test("rejects http, non-provider, and garbage", () => {
    expect(
      parseBlogVideoUrl("http://youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBeNull();
    expect(parseBlogVideoUrl("https://cdn.example.com/clip.mp4")).toBeNull();
    expect(parseBlogVideoUrl("not a url")).toBeNull();
  });
});
