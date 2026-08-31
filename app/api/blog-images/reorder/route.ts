import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      passwordHash?: string;
      postId?: number;
      imageOrders?: Record<string, number>;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const postId = body.postId;
    const imageOrders = body.imageOrders;
    if (!postId || !imageOrders || typeof imageOrders !== "object") {
      return NextResponse.json(
        { error: "postId and imageOrders are required" },
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

    const imageIds = Object.keys(imageOrders);
    if (imageIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    await db.transaction(async (tx) => {
      await Promise.all(
        imageIds.map((imageId, index) =>
          tx
            .update(schema.blogImages)
            .set({ order: -(index + 10000) } as any)
            .where(eq(schema.blogImages.id, imageId)),
        ),
      );
      await Promise.all(
        Object.entries(imageOrders).map(([imageId, order]) =>
          tx
            .update(schema.blogImages)
            .set({ order } as any)
            .where(eq(schema.blogImages.id, imageId)),
        ),
      );
    });

    const post = await db
      .select({ slug: schema.blogPosts.slug, published: schema.blogPosts.published })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .limit(1);
    if (post[0]?.published) {
      await triggerRevalidation({ type: "blog", slug: post[0].slug });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/blog-images/reorder]", error);
    return NextResponse.json(
      { error: "Failed to reorder blog images" },
      { status: 500 },
    );
  }
}
