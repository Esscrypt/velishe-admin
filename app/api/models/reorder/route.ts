import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq, inArray, sql } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { config } from "dotenv";

config();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify password using parsed body
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const db = getDb();
    const { orderedIds } = body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }

    // Update display order for each model
    for (let index = 0; index < orderedIds.length; index++) {
      const modelId = Number.parseInt(orderedIds[index], 10);
      if (!Number.isNaN(modelId)) {
        await db
          .update(schema.models)
          .set({ displayOrder: index } as any)
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
