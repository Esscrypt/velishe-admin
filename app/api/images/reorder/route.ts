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
    const { modelId, orderedImageIds } = body as { 
      modelId: string; 
      orderedImageIds: string[] 
    };

    if (!modelId || !Array.isArray(orderedImageIds)) {
      return NextResponse.json(
        { error: "modelId and orderedImageIds array are required" },
        { status: 400 }
      );
    }

    // Update order for each image
    for (let index = 0; index < orderedImageIds.length; index++) {
      const imageId = orderedImageIds[index];
      await db
        .update(schema.images)
        .set({ order: index })
        .where(eq(schema.images.id, imageId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering images:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}



