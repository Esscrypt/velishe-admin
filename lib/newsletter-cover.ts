import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const NEWSLETTER_COVER_CID = "newsletter-cover@velishe";

export type NewsletterCoverAttachment = {
  cid: string;
  filename: string;
  content: Buffer;
  contentType: string;
};

function contentTypeFromDataUri(data: string): string {
  const match = /^data:([^;,]+)/i.exec(data);
  return match?.[1] || "image/webp";
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "img";
}

function imageDataToBuffer(input: string): Buffer | null {
  const commaIdx = input.startsWith("data:") ? input.indexOf(",") : -1;
  const base64 = commaIdx >= 0 ? input.slice(commaIdx + 1) : input;
  try {
    const buffer = Buffer.from(base64, "base64");
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export function isLocalSiteUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function loadCoverMailAttachment(
  postId: number,
): Promise<NewsletterCoverAttachment | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ data: schema.blogImages.data })
    .from(schema.blogImages)
    .where(
      and(
        eq(schema.blogImages.postId, postId),
        eq(schema.blogImages.order, 0),
      ),
    )
    .limit(1);

  if (rows.length === 0 || !rows[0].data) return null;

  const content = imageDataToBuffer(rows[0].data);
  if (!content) return null;

  const contentType = contentTypeFromDataUri(rows[0].data);
  return {
    cid: NEWSLETTER_COVER_CID,
    filename: `cover.${extensionFromContentType(contentType)}`,
    content,
    contentType,
  };
}

/** Prefer an embedded cover for local dev; use the public URL in production. */
export async function resolveNewsletterCoverImageSrc(
  postId: number,
  coverAbsoluteUrl: string | null,
  userFeUrl: string,
): Promise<{
  coverImageSrc: string | null;
  attachment: NewsletterCoverAttachment | null;
}> {
  if (!coverAbsoluteUrl) {
    return { coverImageSrc: null, attachment: null };
  }

  if (!isLocalSiteUrl(userFeUrl)) {
    return { coverImageSrc: coverAbsoluteUrl, attachment: null };
  }

  const attachment = await loadCoverMailAttachment(postId);
  if (!attachment) {
    return { coverImageSrc: coverAbsoluteUrl, attachment: null };
  }

  return {
    coverImageSrc: `cid:${attachment.cid}`,
    attachment,
  };
}

export function coverAttachmentForNodemailer(
  attachment: NewsletterCoverAttachment,
) {
  return {
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType,
    cid: attachment.cid,
  };
}
