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

    // Update featured image to be the first image (order 0)
    if (orderedImageIds.length > 0) {
      const firstImageId = orderedImageIds[0];
      const firstImage = await db
        .select({
          data: schema.images.data,
          src: schema.images.src,
        })
        .from(schema.images)
        .where(eq(schema.images.id, firstImageId))
        .limit(1);

      if (firstImage.length > 0) {
        // Use base64 data if available, otherwise use src
        const featuredImageSrc = firstImage[0].data || firstImage[0].src || null;
        
        const modelIdNum = Number.parseInt(modelId, 10);
        if (!Number.isNaN(modelIdNum)) {
          await db
            .update(schema.models)
            .set({ featuredImage: featuredImageSrc } as any)
            .where(eq(schema.models.id, modelIdNum));
        }
      }
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



