import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { verifyPasswordHash } from "@/lib/auth";
import { getDb, schema, eq } from "@/lib/db";
import { config } from "dotenv";

config();

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
    const type = formData.get("type") as string; // 'featured' or 'gallery'

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

    // Resize and optimize image
    let sharpInstance = sharp(buffer);

    if (type === "featured") {
      // Featured: 1200x1600
      sharpInstance = sharpInstance.resize(1200, 1600, {
        fit: "inside",
        withoutEnlargement: true,
      });
    } else {
      // Gallery: 1080x1440
      sharpInstance = sharpInstance.resize(1080, 1440, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Process image and get buffer
    const processedBuffer = await sharpInstance.webp({ quality: 85, effort: 6 }).toBuffer();
    
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
      
      if (type === "featured") {
        // Update featured image with base64 data URI
        await db
          .update(schema.models)
          .set({ featuredImage: dataUri } as any)
          .where(eq(schema.models.id, modelIdNum));
      } else {
        // Get current max order for this model
        const existingImages = await db
          .select()
          .from(schema.images)
          .where(eq(schema.images.modelId, modelIdNum));
        
        const maxOrder = existingImages.length > 0
          ? Math.max(...existingImages.map((img) => img.order))
          : -1;
        
        const originalName = file.name.replace(/\.[^/.]+$/, "");
        const imageId = randomUUID();
        
        // Get model slug for alt text
        const model = await db
          .select({ slug: schema.models.slug })
          .from(schema.models)
          .where(eq(schema.models.id, modelIdNum))
          .limit(1);
        
        const modelSlug = model[0]?.slug || "model";
        
        // Insert new image into images table with base64 data
        await db.insert(schema.images).values({
          id: imageId,
          modelId: modelIdNum,
          type: "image",
          src: `db://${imageId}`, // Placeholder since we're using base64 data
          alt: `${modelSlug} - ${originalName}`,
          data: dataUri,
          order: maxOrder + 1,
        } as any);
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

    return NextResponse.json({ 
      success: true, 
      path: dataUri, // Return data URI
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

