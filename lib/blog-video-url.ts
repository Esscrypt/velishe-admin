export type BlogVideoProvider = "youtube" | "vimeo" | "instagram";

export type ParsedBlogVideo = {
  provider: BlogVideoProvider;
  canonicalUrl: string;
  embedUrl: string;
  providerId: string;
};

export function parseBlogVideoUrl(input: string): ParsedBlogVideo | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id) return null;
    return youtube(id);
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2];
      if (!id) return null;
      return youtube(id);
    }
    const id = url.searchParams.get("v");
    if (!id) return null;
    return youtube(id);
  }
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!id || !/^\d+$/.test(id)) return null;
    return {
      provider: "vimeo",
      providerId: id,
      canonicalUrl: `https://vimeo.com/${id}`,
      embedUrl: `https://player.vimeo.com/video/${id}`,
    };
  }
  if (host === "instagram.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [kind, id] = parts;
    if (!["p", "reel", "tv"].includes(kind) || !id) return null;
    const canonicalUrl = `https://www.instagram.com/${kind}/${id}/`;
    return {
      provider: "instagram",
      providerId: id,
      canonicalUrl,
      embedUrl: `${canonicalUrl}embed/`,
    };
  }
  return null;
}

function youtube(id: string): ParsedBlogVideo {
  return {
    provider: "youtube",
    providerId: id,
    canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}
