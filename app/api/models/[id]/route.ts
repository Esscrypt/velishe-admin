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
        stats: schema.models.stats,
        instagram: schema.models.instagram,
        featuredImage: schema.models.featuredImage,
        imageId: schema.images.id,
        imageType: schema.images.type,
        imageSrc: schema.images.src,
        imageAlt: schema.images.alt,
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
    
    // Use base64 data if available, otherwise fallback to path/API route
    let featuredImageSrc = firstRow.featuredImage || "";
    if (featuredImageSrc && !featuredImageSrc.startsWith("data:")) {
      featuredImageSrc = featuredImageSrc.startsWith("/models/")
        ? `/api/images/serve${featuredImageSrc}`
        : featuredImageSrc;
    }
    
    const gallery = rows
      .filter((row) => row.imageId !== null)
      .map((row) => {
        // Use base64 data if available, otherwise fallback to path/API route
        let imageSrc = row.imageData || row.imageSrc;
        if (imageSrc && !imageSrc.startsWith("data:")) {
          imageSrc = imageSrc.startsWith("/models/")
            ? `/api/images/serve${imageSrc}`
            : imageSrc;
        }
        return {
          id: row.imageId,
          type: row.imageType,
          src: imageSrc || row.imageSrc,
          alt: row.imageAlt,
        };
      });

    return NextResponse.json({
      id: firstRow.modelId,
      slug: firstRow.slug,
      name: firstRow.name,
      stats: firstRow.stats,
      instagram: firstRow.instagram || undefined,
      featuredImage: featuredImageSrc,
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
        stats: modelData.stats,
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

