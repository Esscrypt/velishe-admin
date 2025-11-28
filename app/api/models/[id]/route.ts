import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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
    
    // Remove passwordHash from body before processing
    const { passwordHash, ...modelData } = body;

    const updated = await db
      .update(schema.models)
      .set({
        slug: modelData.slug,
        name: modelData.name,
        stats: modelData.stats,
        instagram: modelData.instagram || null,
        featuredImage: modelData.featuredImage || null,
      })
      .where(eq(schema.models.id, modelId))
      .returning();
    
    // If gallery is provided, update images
    if (modelData.gallery && Array.isArray(modelData.gallery)) {
      // Get existing images
      const existingImages = await db
        .select()
        .from(schema.images)
        .where(eq(schema.images.modelId, modelId));
      
      const existingImageIds = new Set(existingImages.map((img) => img.id));
      const providedImageIds = new Set(
        modelData.gallery
          .map((img: any) => img.id)
          .filter((id: any) => id !== undefined && id !== null)
      );
      
      // Delete images that are no longer in the gallery
      const imagesToDelete = existingImages.filter(
        (img) => !providedImageIds.has(img.id)
      );
      
      for (const img of imagesToDelete) {
        await db.delete(schema.images).where(eq(schema.images.id, img.id));
      }
      
      // Update or insert images
      for (let index = 0; index < modelData.gallery.length; index++) {
        const img = modelData.gallery[index];
        const imageId = img.id || randomUUID();
        
        if (existingImageIds.has(imageId)) {
          // Update existing image
          const updateData: any = {
            type: img.type || "image",
            src: img.src,
            alt: img.alt || "",
            order: index,
          };
          // Update data if provided
          if (img.data !== undefined) {
            updateData.data = img.data;
          }
          await db
            .update(schema.images)
            .set(updateData)
            .where(eq(schema.images.id, imageId));
        } else {
          // Insert new image (with base64 data if provided)
          await db.insert(schema.images).values({
            id: imageId,
            modelId: modelId,
            type: img.type || "image",
            src: img.src || "",
            alt: img.alt || "",
            data: img.data || null, // Base64 data
            order: index,
          });
        }
      }
    }

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

