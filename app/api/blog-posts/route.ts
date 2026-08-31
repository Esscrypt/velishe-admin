import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { slugifyTitle, uniqueSlug } from "@/lib/blog-slug";
import {
  applyPublishIntent,
  resolvePublishIntent,
} from "@/lib/blog-publish";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passwordHash = searchParams.get("passwordHash");
    const authResult = await verifyAuth({
      passwordHash: passwordHash ?? undefined,
    });
    if (!authResult.authorized) return authResult.response!;

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const posts = await db
      .select()
      .from(schema.blogPosts)
      .orderBy(desc(schema.blogPosts.createdAt));

    return NextResponse.json(posts);
  } catch (error) {
    console.error("[GET /api/blog-posts]", error);
    return NextResponse.json(
      { error: "Failed to fetch blog posts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      passwordHash?: string;
      title?: string;
      slug?: string;
      teaser?: string | null;
      body?: string;
      published?: boolean;
      scheduledPublishAt?: string | null;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const postBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!title || !postBody) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const existing = await db
      .select({ slug: schema.blogPosts.slug })
      .from(schema.blogPosts);
    const existingSlugs = existing.map((row) => row.slug);
    const requestedSlug =
      typeof body.slug === "string" && body.slug.trim()
        ? slugifyTitle(body.slug.trim())
        : slugifyTitle(title);
    const slug = uniqueSlug(requestedSlug, existingSlugs);
    const now = new Date();
    const publishIntent = resolvePublishIntent(
      {
        published: body.published,
        scheduledPublishAt: body.scheduledPublishAt,
      },
      {
        published: false,
        publishedAt: null,
        scheduledPublishAt: null,
      },
      now,
    );
    if ("error" in publishIntent) {
      return NextResponse.json({ error: publishIntent.error }, { status: 400 });
    }
    const publishFields = applyPublishIntent(
      publishIntent,
      {
        published: false,
        publishedAt: null,
        scheduledPublishAt: null,
      },
      now,
    );

    const inserted = await db
      .insert(schema.blogPosts)
      .values({
        title,
        slug,
        teaser:
          typeof body.teaser === "string" && body.teaser.trim()
            ? body.teaser.trim()
            : null,
        body: postBody,
        published: publishFields.published,
        publishedAt: publishFields.publishedAt,
        scheduledPublishAt: publishFields.scheduledPublishAt,
        updatedAt: now,
      } as typeof schema.blogPosts.$inferInsert)
      .returning();

    if (publishFields.published) {
      await triggerRevalidation({ type: "blog", slug });
    }

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("[POST /api/blog-posts]", error);
    return NextResponse.json(
      { error: "Failed to create blog post" },
      { status: 500 },
    );
  }
}
