import type { BlogVideoProvider } from "./blog-video-url";

export type BlogMediaKind = "image" | "video";

export function assertBlogMediaFields(input: {
  kind: BlogMediaKind;
  data: string | null;
  videoUrl: string | null;
  videoProvider: BlogVideoProvider | null;
}): { ok: true } | { ok: false; error: string } {
  if (input.kind === "image") {
    if (!input.data) return { ok: false, error: "Image media requires data" };
    if (input.videoUrl || input.videoProvider) {
      return { ok: false, error: "Image media must not set video fields" };
    }
    return { ok: true };
  }
  if (!input.videoUrl || !input.videoProvider) {
    return {
      ok: false,
      error: "Video media requires videoUrl and videoProvider",
    };
  }
  return { ok: true };
}
