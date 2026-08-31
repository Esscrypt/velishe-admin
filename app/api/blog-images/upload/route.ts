import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { verifyPasswordHash } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { BlogImageInsert } from "@/lib/db/schema";
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

    const file = formData.get("file") as File | null;
    const postIdRaw = formData.get("postId") as string | null;
    const alt = ((formData.get("alt") as string | null) || "").trim();
    const asCover = formData.get("asCover") === "true";

    if (!file || !postIdRaw) {
      return NextResponse.json(
        { error: "file and postId are required" },
        { status: 400 },
      );
    }

    const postId = Number.parseInt(postIdRaw, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
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

    const bytes = await file.arrayBuffer();
    const processedBuffer = await sharp(Buffer.from(bytes))
      .rotate()
      .resize(2400, 3200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 95, effort: 4, smartSubsample: false })
      .toBuffer();
    const dataUri = `data:image/webp;base64,${processedBuffer.toString("base64")}`;
    const imageId = randomUUID();

    if (asCover) {
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
      await db.insert(schema.blogImages).values({
        id: imageId,
        postId,
        data: dataUri,
        alt,
        order: 0,
      } as BlogImageInsert);
    } else {
      const maxOrderRows = await db
        .select({ order: schema.blogImages.order })
        .from(schema.blogImages)
        .where(eq(schema.blogImages.postId, postId))
        .orderBy(desc(schema.blogImages.order))
        .limit(1);
      const nextOrder = Math.max(1, (maxOrderRows[0]?.order ?? 0) + 1);
      await db.insert(schema.blogImages).values({
        id: imageId,
        postId,
        data: dataUri,
        alt,
        order: nextOrder,
      } as BlogImageInsert);
    }

    if (posts[0].published) {
      await triggerRevalidation({ type: "blog", slug: posts[0].slug });
    }

    return NextResponse.json({ id: imageId, order: asCover ? 0 : undefined });
  } catch (error) {
    console.error("[POST /api/blog-images/upload]", error);
    return NextResponse.json(
      { error: "Failed to upload blog image" },
      { status: 500 },
    );
  }
}
