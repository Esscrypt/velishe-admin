import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { slugifyTitle, uniqueSlug } from "@/lib/blog-slug";
import {
  applyPublishIntent,
  resolvePublishIntent,
} from "@/lib/blog-publish";
import { resolveBlogModelId, modelSlugForId } from "@/lib/blog-model-id";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url);
    const passwordHash = searchParams.get("passwordHash");
    const authResult = await verifyAuth({
      passwordHash: passwordHash ?? undefined,
    });
    if (!authResult.authorized) return authResult.response!;

    const { id } = await context.params;
    const postId = Number.parseInt(id, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

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
      .where(eq(schema.blogPosts.id, postId))
      .limit(1);
    if (posts.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const images = await db
      .select({
        id: schema.blogImages.id,
        alt: schema.blogImages.alt,
        order: schema.blogImages.order,
        kind: schema.blogImages.kind,
        videoUrl: schema.blogImages.videoUrl,
        videoProvider: schema.blogImages.videoProvider,
        hasData: sql<boolean>`(${schema.blogImages.data} is not null)`,
      })
      .from(schema.blogImages)
      .where(eq(schema.blogImages.postId, postId))
      .orderBy(asc(schema.blogImages.order));

    return NextResponse.json({
      ...posts[0],
      images: images.map((image) => ({
        ...image,
        kind: (image.kind as "image" | "video") || "image",
        hasData: Boolean(image.hasData),
      })),
    });
  } catch (error) {
    console.error("[GET /api/blog-posts/:id]", error);
    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json()) as {
      passwordHash?: string;
      title?: string;
      slug?: string;
      teaser?: string | null;
      body?: string;
      published?: boolean;
      scheduledPublishAt?: string | null;
      modelId?: number | null;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const { id } = await context.params;
    const postId = Number.parseInt(id, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

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
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const current = existing[0];
    const allSlugs = await db
      .select({ id: schema.blogPosts.id, slug: schema.blogPosts.slug })
      .from(schema.blogPosts);
    const otherSlugs = allSlugs
      .filter((row) => row.id !== postId)
      .map((row) => row.slug);
    const requestedSlug =
      typeof body.slug === "string" && body.slug.trim()
        ? slugifyTitle(body.slug.trim())
        : current.slug;
    const slug = uniqueSlug(requestedSlug, otherSlugs);
    const now = new Date();
    const publishIntent = resolvePublishIntent(
      {
        published: body.published,
        scheduledPublishAt: body.scheduledPublishAt,
      },
      {
        published: current.published,
        publishedAt: current.publishedAt,
        scheduledPublishAt: current.scheduledPublishAt,
      },
      now,
    );
    if ("error" in publishIntent) {
      return NextResponse.json({ error: publishIntent.error }, { status: 400 });
    }
    const publishFields = applyPublishIntent(
      publishIntent,
      {
        published: current.published,
        publishedAt: current.publishedAt,
        scheduledPublishAt: current.scheduledPublishAt,
      },
      now,
    );

    const previousModelId = current.modelId ?? null;
    const hasModelIdKey = Object.prototype.hasOwnProperty.call(body, "modelId");
    const resolvedModelId = hasModelIdKey
      ? await resolveBlogModelId(db, body.modelId)
      : undefined;
    const nextModelId =
      resolvedModelId === undefined ? previousModelId : resolvedModelId;

    const updated = await db
      .update(schema.blogPosts)
      .set({
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
        ...(hasModelIdKey ? { modelId: nextModelId } : {}),
        updatedAt: now,
      } as typeof schema.blogPosts.$inferInsert)
      .where(eq(schema.blogPosts.id, postId))
      .returning();

    if (
      publishFields.published ||
      current.published ||
      publishFields.scheduledPublishAt
    ) {
      await triggerRevalidation({ type: "blog", slug: updated[0].slug });
      const slugsToRevalidate = new Set<string>();
      const prevSlug = await modelSlugForId(db, previousModelId);
      const nextSlug = await modelSlugForId(db, nextModelId);
      if (prevSlug) slugsToRevalidate.add(prevSlug);
      if (nextSlug) slugsToRevalidate.add(nextSlug);
      for (const modelSlug of slugsToRevalidate) {
        await triggerRevalidation({ type: "models", slug: modelSlug });
      }
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("[PUT /api/blog-posts/:id]", error);
    return NextResponse.json(
      { error: "Failed to update blog post" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json()) as { passwordHash?: string };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const { id } = await context.params;
    const postId = Number.parseInt(id, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const deleted = await db
      .delete(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await triggerRevalidation({ type: "blog", slug: deleted[0].slug });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/blog-posts/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete blog post" },
      { status: 500 },
    );
  }
}
