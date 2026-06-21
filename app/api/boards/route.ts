import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq, asc } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database connection not available" }, { status: 500 });
  }
  const rows = await db
    .select()
    .from(schema.boards)
    .orderBy(asc(schema.boards.displayOrder));
  return NextResponse.json(rows);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id, enabled } = body as { id?: string; enabled?: boolean };
    if (!id || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "id and enabled are required" }, { status: 400 });
    }

    const db = getDb();
    const updated = await db
      .update(schema.boards)
      .set({ enabled } as any)
      .where(eq(schema.boards.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    await triggerRevalidation();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}
