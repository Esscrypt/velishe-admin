import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

type RouteContext = { params: Promise<{ id: string }> };

function contentTypeFromDataUri(data: string): string {
  const match = /^data:([^;,]+)/i.exec(data);
  return match?.[1] || "image/webp";
}

function imageDataToBuffer(input: string): Buffer | null {
  const commaIdx = input.startsWith("data:") ? input.indexOf(",") : -1;
  const base64 = commaIdx >= 0 ? input.slice(commaIdx + 1) : input;
  try {
    const buf = Buffer.from(base64, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const rows = await db
      .select({ data: schema.blogImages.data })
      .from(schema.blogImages)
      .where(eq(schema.blogImages.id, id))
      .limit(1);
    if (rows.length === 0 || !rows[0].data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = imageDataToBuffer(rows[0].data);
    if (!buffer) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 500 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromDataUri(rows[0].data),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[GET /api/blog-images/:id]", error);
    return NextResponse.json(
      { error: "Failed to load image" },
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
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const deleted = await db
      .delete(schema.blogImages)
      .where(eq(schema.blogImages.id, id))
      .returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const post = await db
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, deleted[0].postId))
      .limit(1);
    if (post[0]?.published) {
      await triggerRevalidation({ type: "blog", slug: post[0].slug });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/blog-images/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
