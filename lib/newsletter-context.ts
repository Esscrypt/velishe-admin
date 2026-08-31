import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { plainTextFromMarkdown } from "@/lib/blog-markdown";
import type { NewsletterBuildArgs } from "@/lib/newsletter-html";

type PostRow = {
  title: string;
  teaser: string | null;
  body: string;
  slug: string;
};

export async function loadPostNewsletterContext(postId: number): Promise<{
  post: PostRow;
  coverAbsoluteUrl: string | null;
  readUrl: string;
  userFeUrl: string;
} | null> {
  const db = getDb();
  if (!db) return null;

  const posts = await db
    .select({
      title: schema.blogPosts.title,
      teaser: schema.blogPosts.teaser,
      body: schema.blogPosts.body,
      slug: schema.blogPosts.slug,
    })
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.id, postId))
    .limit(1);

  if (posts.length === 0) return null;

  const userFeUrl = (process.env.USER_FE_URL || "").replace(/\/$/, "");
  if (!userFeUrl) return null;

  const cover = await db
    .select({ id: schema.blogImages.id })
    .from(schema.blogImages)
    .where(
      and(
        eq(schema.blogImages.postId, postId),
        eq(schema.blogImages.order, 0),
      ),
    )
    .limit(1);

  return {
    post: posts[0],
    coverAbsoluteUrl: cover[0]
      ? `${userFeUrl}/api/blog-images/${cover[0].id}/`
      : null,
    readUrl: `${userFeUrl}/blog/${posts[0].slug}/`,
    userFeUrl,
  };
}

export function buildNewsletterArgsFromPost(
  context: {
    post: PostRow;
    coverAbsoluteUrl: string | null;
    readUrl: string;
    userFeUrl: string;
  },
  options: {
    unsubscribeUrl: string;
    isPreview?: boolean;
    coverImageSrc?: string | null;
  },
): NewsletterBuildArgs {
  const teaserText =
    context.post.teaser?.trim() ||
    plainTextFromMarkdown(context.post.body, 160);

  return {
    title: context.post.title,
    teaser: teaserText,
    body: context.post.body,
    coverImageSrc:
      options.coverImageSrc !== undefined
        ? options.coverImageSrc
        : context.coverAbsoluteUrl,
    readUrl: context.readUrl,
    unsubscribeUrl: options.unsubscribeUrl,
    isPreview: options.isPreview,
  };
}
