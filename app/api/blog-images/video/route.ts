import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { verifyPasswordHash } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { BlogImageInsert } from "@/lib/db/schema";
import { assertBlogMediaFields } from "@/lib/blog-media";
import { parseBlogVideoUrl } from "@/lib/blog-video-url";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const passwordHash = formData.get("passwordHash") as string;
    if (!passwordHash || !(await verifyPasswordHash(passwordHash))) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const postIdRaw = formData.get("postId") as string | null;
    const videoUrlRaw = ((formData.get("videoUrl") as string | null) || "").trim();
    const alt = ((formData.get("alt") as string | null) || "").trim();
    const asCover = formData.get("asCover") === "true";
    const file = formData.get("file") as File | null;

    if (!postIdRaw || !videoUrlRaw) {
      return NextResponse.json(
        { error: "postId and videoUrl are required" },
        { status: 400 },
      );
    }

    const postId = Number.parseInt(postIdRaw, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }

    const parsed = parseBlogVideoUrl(videoUrlRaw);
    if (!parsed) {
      return NextResponse.json(
        { error: "Unsupported or invalid video URL" },
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

    const posts = await db
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .limit(1);
    if (posts.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let posterDataUri: string | null = null;
    if (file) {
      const bytes = await file.arrayBuffer();
      const processedBuffer = await sharp(Buffer.from(bytes))
        .rotate()
        .resize(2400, 3200, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 95, effort: 4, smartSubsample: false })
        .toBuffer();
      posterDataUri = `data:image/webp;base64,${processedBuffer.toString("base64")}`;
    }

    const fields = assertBlogMediaFields({
      kind: "video",
      data: posterDataUri,
      videoUrl: parsed.canonicalUrl,
      videoProvider: parsed.provider,
    });
    if (fields.ok === false) {
      return NextResponse.json({ error: fields.error }, { status: 400 });
    }

    const existingCount = await db
      .select({ order: schema.blogImages.order })
      .from(schema.blogImages)
      .where(eq(schema.blogImages.postId, postId));

    const useAsCover = asCover || existingCount.length === 0;
    let order = 0;
    if (useAsCover) {
      const existingCover = await db
        .select()
        .from(schema.blogImages)
        .where(
          and(
            eq(schema.blogImages.postId, postId),
            eq(schema.blogImages.order, 0),
          ),
        )
        .limit(1);
      if (existingCover.length > 0) {
        await db
          .delete(schema.blogImages)
          .where(eq(schema.blogImages.id, existingCover[0].id));
      }
      order = 0;
    } else {
      const maxOrderRows = await db
        .select({ order: schema.blogImages.order })
        .from(schema.blogImages)
        .where(eq(schema.blogImages.postId, postId))
        .orderBy(desc(schema.blogImages.order))
        .limit(1);
      order = Math.max(1, (maxOrderRows[0]?.order ?? 0) + 1);
    }

    const mediaId = randomUUID();
    await db.insert(schema.blogImages).values({
      id: mediaId,
      postId,
      kind: "video",
      data: posterDataUri,
      videoUrl: parsed.canonicalUrl,
      videoProvider: parsed.provider,
      alt,
      order,
    } as BlogImageInsert);

    if (posts[0].published) {
      await triggerRevalidation({ type: "blog", slug: posts[0].slug });
    }

    return NextResponse.json({
      id: mediaId,
      order,
      kind: "video",
      videoUrl: parsed.canonicalUrl,
      videoProvider: parsed.provider,
      alt,
      hasData: Boolean(posterDataUri),
    });
  } catch (error) {
    console.error("[POST /api/blog-images/video]", error);
    return NextResponse.json(
      { error: "Failed to add blog video" },
      { status: 500 },
    );
  }
}
