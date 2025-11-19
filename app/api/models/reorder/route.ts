import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { config } from "dotenv";

config();

export async function POST(request: NextRequest) {
  // Verify password
  const authResult = await verifyAuth(request);
  if (!authResult.authorized) {
    return authResult.response!;
  }

  try {
    const db = getDb();
    // Use the body from auth middleware (body is already parsed)
    const body = authResult.body!;
    const { orderedIds } = body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds must be an array" },
        { status: 400 }
      );
    }

    // Update display order for each model
    for (let i = 0; i < orderedIds.length; i++) {
      const modelId = Number.parseInt(orderedIds[i], 10);
      if (!Number.isNaN(modelId)) {
        await db
          .update(schema.models)
          .set({ displayOrder: i })
          .where(eq(schema.models.id, modelId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering models:", error);
    return NextResponse.json(
      { error: "Failed to reorder models" },
      { status: 500 }
    );
  }
}

