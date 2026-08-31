import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { plainTextFromMarkdown } from "@/lib/blog-markdown";
import type { NewsletterBuildArgs } from "@/lib/newsletter-html";
import {
  PRODUCTION_SITE_URL,
  type NewsletterContextFailureReason,
} from "@/lib/user-fe-url";

type PostRow = {
  title: string;
  teaser: string | null;
  body: string;
  slug: string;
};

export type PostNewsletterContext = {
  post: PostRow;
  coverAbsoluteUrl: string | null;
  readUrl: string;
  userFeUrl: string;
};

export type LoadPostNewsletterContextResult =
  | { ok: true; data: PostNewsletterContext }
  | { ok: false; reason: NewsletterContextFailureReason };

export async function loadPostNewsletterContext(
  postId: number,
): Promise<LoadPostNewsletterContextResult> {
  const db = getDb();
  if (!db) return { ok: false, reason: "database" };

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

  if (posts.length === 0) return { ok: false, reason: "post_not_found" };

  const userFeUrl = PRODUCTION_SITE_URL;

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
    ok: true,
    data: {
      post: posts[0],
      coverAbsoluteUrl: cover[0]
        ? `${userFeUrl}/api/blog-images/${cover[0].id}/`
        : null,
      readUrl: `${userFeUrl}/blog/${posts[0].slug}/`,
      userFeUrl,
    },
  };
}

export function buildNewsletterArgsFromPost(
  context: PostNewsletterContext,
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
