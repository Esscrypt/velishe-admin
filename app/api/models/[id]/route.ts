import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq, asc } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { config } from "dotenv";

config();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const modelId = Number.parseInt(id, 10);
    
    if (Number.isNaN(modelId)) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }
    
    const db = getDb();
    
    // Single query with LEFT JOIN
    const rows = await db
      .select({
        modelId: schema.models.id,
        slug: schema.models.slug,
        name: schema.models.name,
        height: schema.models.height,
        bust: schema.models.bust,
        waist: schema.models.waist,
        hips: schema.models.hips,
        shoeSize: schema.models.shoeSize,
        hairColor: schema.models.hairColor,
        eyeColor: schema.models.eyeColor,
        instagram: schema.models.instagram,
        imageId: schema.images.id,
        imageData: schema.images.data,
        imageOrder: schema.images.order,
      })
      .from(schema.models)
      .leftJoin(schema.images, eq(schema.models.id, schema.images.modelId))
      .where(eq(schema.models.id, modelId))
      .orderBy(asc(schema.images.order));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const firstRow = rows[0];
    
    // Separate featured image (order 0) from gallery
    let featuredImageSrc = "";
    const gallery: Array<{ id: string; type: "image"; src: string; alt: string }> = [];
    
    for (const row of rows) {
      // Only process rows that have image data
      if (row.imageId && row.imageData) {
        const imageSrc = row.imageData; // This is the data URI from the database (e.g., "data:image/webp;base64,...")
        
        // Ensure imageSrc is a valid string
        if (typeof imageSrc !== 'string' || imageSrc.trim() === '') {
          console.warn(`[GET /api/models/${modelId}] Skipping image ${row.imageId} with invalid data`);
          continue;
        }
        
        // Image with order 0 is the featured image
        if (row.imageOrder === 0) {
          featuredImageSrc = imageSrc;
        } else {
          // Other images go to gallery - ensure src is always set
          gallery.push({
            id: row.imageId,
            type: "image",
            src: imageSrc, // data URI from database - can be used directly as img src
            alt: "",
          });
        }
      }
    }
    
    // If no featured image (order 0) but we have gallery images, use the first one
    if (!featuredImageSrc && gallery.length > 0) {
      featuredImageSrc = gallery[0].src;
      gallery.shift(); // Remove it from gallery since it's now featured
    }

    return NextResponse.json({
      id: firstRow.modelId,
      slug: firstRow.slug,
      name: firstRow.name,
      stats: {
        height: firstRow.height || "",
        bust: firstRow.bust || "",
        waist: firstRow.waist || "",
        hips: firstRow.hips || "",
        shoeSize: firstRow.shoeSize || "",
        hairColor: firstRow.hairColor || "",
        eyeColor: firstRow.eyeColor || "",
      },
      instagram: firstRow.instagram || undefined,
      featuredImage: featuredImageSrc, // Empty string if no images, never null
      gallery,
    });
  } catch (error) {
    console.error("Error fetching model:", error);
    return NextResponse.json(
      { error: "Failed to fetch model" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const modelId = Number.parseInt(id, 10);
    
    if (Number.isNaN(modelId)) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }
    
    const db = getDb();
    
    // Remove passwordHash, featuredImage, and gallery from body before processing
    // Only update stats, name, slug, and instagram - images are handled separately via /api/upload
    const { passwordHash, featuredImage, gallery, ...modelData } = body;

    const updated = await db
      .update(schema.models)
      .set({
        slug: modelData.slug,
        name: modelData.name,
        height: modelData.stats?.height || null,
        bust: modelData.stats?.bust || null,
        waist: modelData.stats?.waist || null,
        hips: modelData.stats?.hips || null,
        shoeSize: modelData.stats?.shoeSize || null,
        hairColor: modelData.stats?.hairColor || null,
        eyeColor: modelData.stats?.eyeColor || null,
        instagram: modelData.instagram || null,
        // featuredImage and gallery are not updated here - they're handled via /api/upload
      } as any)
      .where(eq(schema.models.id, modelId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

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
    const modelId = Number.parseInt(id, 10);
    
    if (Number.isNaN(modelId)) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }
    
    const db = getDb();

    const deleted = await db
      .delete(schema.models)
      .where(eq(schema.models.id, modelId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}

