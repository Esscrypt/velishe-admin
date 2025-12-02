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
    const { modelId, imageOrders } = body as { 
      modelId: string; 
      imageOrders: Record<string, number>; // { imageId: order }
    };

    if (!modelId || !imageOrders || typeof imageOrders !== 'object') {
      return NextResponse.json(
        { error: "modelId and imageOrders object are required" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    const modelIdNum = Number.parseInt(modelId, 10);
    if (Number.isNaN(modelIdNum)) {
      return NextResponse.json(
        { error: "Invalid modelId" },
        { status: 400 }
      );
    }

    // Use a transaction to ensure all updates happen atomically
    // This avoids unique constraint violations during reordering
    await db.transaction(async (tx) => {
      // Phase 1: Set all orders to temporary negative values to avoid conflicts
      // Execute all Phase 1 updates in parallel
      const imageIds = Object.keys(imageOrders);
      await Promise.all(
        imageIds.map((imageId, index) =>
          tx
            .update(schema.images)
            .set({ order: -(index + 10000) } as any) // Use large negative values to avoid conflicts
            .where(eq(schema.images.id, imageId))
        )
      );
      
      // Phase 2: Set to final order values from the imageOrders mapping
      // Execute all Phase 2 updates in parallel
      await Promise.all(
        Object.entries(imageOrders).map(([imageId, order]) =>
          tx
            .update(schema.images)
            .set({ order } as any)
            .where(eq(schema.images.id, imageId))
        )
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering images:", error);
    return NextResponse.json(
      { error: "Failed to reorder images" },
      { status: 500 }
    );
  }
}



