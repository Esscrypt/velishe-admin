import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";

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

    const rows = await db
      .select({
        id: schema.mailingListSubscribers.id,
        email: schema.mailingListSubscribers.email,
        confirmed: schema.mailingListSubscribers.confirmed,
        confirmedAt: schema.mailingListSubscribers.confirmedAt,
        unsubscribedAt: schema.mailingListSubscribers.unsubscribedAt,
        createdAt: schema.mailingListSubscribers.createdAt,
      })
      .from(schema.mailingListSubscribers)
      .orderBy(desc(schema.mailingListSubscribers.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[GET /api/mailing-list]", error);
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 },
    );
  }
}
