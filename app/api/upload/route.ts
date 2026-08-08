import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { verifyPasswordHash } from "@/lib/auth";
import { getDb, schema, eq, and } from "@/lib/db";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export const runtime = "nodejs";
export const maxDuration = 60;

export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const passwordHash = formData.get("passwordHash") as string;

    if (!passwordHash) {
      return NextResponse.json(
        { error: "Password hash is required" },
        { status: 401 }
      );
    }

    const isValid = await verifyPasswordHash(passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }
    const file = formData.get("file") as File;
    const slug = formData.get("slug") as string | null;
    const modelId = formData.get("modelId") as string | null;
    const imageType = formData.get("imageType") as string | null; // 'image' or 'digital'
    const type = formData.get("type") as string; // 'featured' or 'gallery'
    const phash = (formData.get("phash") as string | null) || null;
    // order param is sent by frontend but not used here — reorder endpoint handles final ordering

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    if (!slug && !modelId) {
      return NextResponse.json(
        { error: "Either slug or modelId is required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Preserve quality: only fit inside large display bounds (never enlarge),
    // encode WebP at high quality. Client may have pre-capped size for the
    // Vercel body limit; this is the canonical encode step.
    const maxWidth = type === "featured" ? 3000 : 2400;
    const maxHeight = type === "featured" ? 4000 : 3200;

    const processedBuffer = await sharp(buffer)
      .rotate() // honor EXIF orientation
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 95, effort: 4, smartSubsample: false })
      .toBuffer();
    
    // Convert to base64
    const base64Data = processedBuffer.toString("base64");
    const dataUri = `data:image/webp;base64,${base64Data}`;

    // Save to database only
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }

    let imageId: string = "";
    let modelSlug: string | undefined;

    try {
      let modelIdNum: number;
      
      // Find model by slug or use provided modelId
      if (modelId) {
        modelIdNum = Number.parseInt(modelId, 10);
        if (Number.isNaN(modelIdNum)) {
          return NextResponse.json(
            { error: "Invalid modelId" },
            { status: 400 }
          );
        }
        
        // Verify model exists
        const model = await db
          .select()
          .from(schema.models)
          .where(eq(schema.models.id, modelIdNum))
          .limit(1);
        
        if (model.length === 0) {
          return NextResponse.json(
            { error: `Model with id "${modelId}" not found` },
            { status: 404 }
          );
        }
      } else if (slug) {
        const model = await db
          .select()
          .from(schema.models)
          .where(eq(schema.models.slug, slug))
          .limit(1);

        if (model.length === 0) {
          return NextResponse.json(
            { error: `Model with slug "${slug}" not found` },
            { status: 404 }
          );
        }
        
        modelIdNum = model[0].id;
      } else {
        return NextResponse.json(
          { error: "Either slug or modelId is required" },
          { status: 400 }
        );
      }
      
      const originalName = file.name.replace(/\.[^/.]+$/, "");

      // Get model slug for alt text
      const model = await db
        .select({ slug: schema.models.slug })
        .from(schema.models)
        .where(eq(schema.models.id, modelIdNum))
        .limit(1);

      modelSlug = model[0]?.slug || undefined;
      const altSlug = modelSlug ?? "model";
      if (type === "featured") {
        // Featured image is stored in images table with order 0
        // First, check if there's already a featured image (order 0)
        const existingFeatured = await db
          .select()
          .from(schema.images)
          .where(and(
            eq(schema.images.modelId, modelIdNum),
            eq(schema.images.order, 0)
          ))
          .limit(1);

        if (existingFeatured.length > 0) {
          // Replace with a new id so CDN-cached /api/images/{id}/ URLs on the
          // public FE cannot keep serving the previous bytes.
          await db
            .delete(schema.images)
            .where(eq(schema.images.id, existingFeatured[0].id));
          imageId = randomUUID();
          await db.insert(schema.images).values({
            id: imageId,
            modelId: modelIdNum,
            type: imageType || "image",
            src: `db://${imageId}`,
            alt: `${altSlug} - ${originalName}`,
            data: dataUri,
            order: 0,
            phash,
          } as any);
        } else {
          // Insert new featured image with order 0
          imageId = randomUUID();
          await db.insert(schema.images).values({
            id: imageId,
            modelId: modelIdNum,
            type: imageType || "image",
            src: `db://${imageId}`,
            alt: `${altSlug} - ${originalName}`,
            data: dataUri,
            order: 0, // Featured images have order 0
            phash,
          } as any);
        }
      } else {
        // Gallery/digital image: insert with a unique high temporary order; the
        // reorder endpoint sets final ordering. Retry on unique(model_id, order)
        // collisions caused by concurrent parallel uploads instead of failing.
        imageId = randomUUID();
        let inserted = false;
        let lastInsertError: unknown;

        for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
          const tempOrder = 10000 + Math.floor(Math.random() * 1_000_000);
          try {
            await db.insert(schema.images).values({
              id: imageId,
              modelId: modelIdNum,
              type: imageType || "image",
              src: `db://${imageId}`,
              alt: `${altSlug} - ${originalName}`,
              data: dataUri,
              order: tempOrder,
              phash,
            } as any);
            inserted = true;
          } catch (insertError) {
            lastInsertError = insertError;
            const code = (insertError as { code?: string })?.code;
            if (code !== "23505") {
              throw insertError;
            }
          }
        }

        if (!inserted) {
          throw lastInsertError;
        }
      }
    } catch (dbError) {
      console.error("Error saving to database:", dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      const errorDetails = dbError instanceof Error ? dbError.stack : undefined;
      console.error("Database error details:", { errorMessage, errorDetails, dbError });
      return NextResponse.json(
        { 
          error: "Failed to save image to database",
          details: errorMessage 
        },
        { status: 500 }
      );
    }

    if (modelSlug) {
      await triggerRevalidation(modelSlug);
    }

    return NextResponse.json({
      success: true,
      path: dataUri, // Return data URI
      imageId: imageId, // Return image ID for reorder mapping
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

