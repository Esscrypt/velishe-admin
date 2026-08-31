import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Database connection not available" },
      { status: 503 },
    );
  }

  const now = new Date();
  const due = await db
    .select({
      id: schema.blogPosts.id,
      slug: schema.blogPosts.slug,
    })
    .from(schema.blogPosts)
    .where(
      and(
        eq(schema.blogPosts.published, false),
        isNotNull(schema.blogPosts.scheduledPublishAt),
        lte(schema.blogPosts.scheduledPublishAt, now),
      ),
    );

  let published = 0;
  for (const post of due) {
    await db
      .update(schema.blogPosts)
      .set({
        published: true,
        publishedAt: now,
        scheduledPublishAt: null,
        updatedAt: now,
      } as Partial<typeof schema.blogPosts.$inferInsert>)
      .where(eq(schema.blogPosts.id, post.id));

    await triggerRevalidation({ type: "blog", slug: post.slug });
    published += 1;
  }

  return NextResponse.json({ published, checkedAt: now.toISOString() });
}
