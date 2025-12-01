import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq } from "@/lib/db";
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
        .set({ order: index } as any)
        .where(eq(schema.images.id, imageId));
    }

    // Featured image is automatically the image with order 0, no need to update models table

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering images:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}



