import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { config } from "dotenv";

config();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    
    // Verify password using parsed body
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }
    const { id } = await params;
    const db = getDb();

    const deleted = await db
      .delete(schema.images)
      .where(eq(schema.images.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}





