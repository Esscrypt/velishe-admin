import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { verifyPasswordHash } from "@/lib/auth";
import { getDb, schema, eq } from "@/lib/db";
import { config } from "dotenv";

config();

export async function POST(request: NextRequest) {
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
    const slug = formData.get("slug") as string;
    const type = formData.get("type") as string; // 'featured' or 'gallery'

    if (!file || !slug) {
      return NextResponse.json(
        { error: "File and slug are required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine output directory (assuming public/models structure)
    const publicDir = join(process.cwd(), "public", "models", slug);
    if (!existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const filename = type === "featured" 
      ? "featured.webp"
      : `${originalName}-${timestamp}.webp`;
    const outputPath = join(publicDir, filename);

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
    
    // Also save to filesystem for backup
    await sharp(processedBuffer).toFile(outputPath);
    
    // Return the public URL path
    const publicPath = `/models/${slug}/${filename}`;

    // Save to database
    const db = getDb();
    if (db) {
      try {
        const model = await db
          .select()
          .from(schema.models)
          .where(eq(schema.models.slug, slug))
          .limit(1);

        if (model.length > 0) {
          const modelId = model[0].id;
          
          if (type === "featured") {
            // Update featured image with base64 data URI
            await db
              .update(schema.models)
              .set({ [schema.models.featuredImage.name]: dataUri })
              .where(eq(schema.models.slug, slug));
          } else {
            // Check if image already exists
            const existingImage = await db
              .select()
              .from(schema.images)
              .where(eq(schema.images.src, publicPath))
              .limit(1);
            
            if (existingImage.length === 0) {
              // Get current max order for this model
              const existingImages = await db
                .select()
                .from(schema.images)
                .where(eq(schema.images.modelId, modelId));
              
              const maxOrder = existingImages.length > 0
                ? Math.max(...existingImages.map((img) => img.order))
                : -1;
              
              // Insert new image into images table with base64 data
              await db.insert(schema.images).values({[schema.images.id.name]: randomUUID(),
                id: randomUUID(),
                modelId,
                type: "image",
                src: publicPath,
                alt: `${slug} - ${originalName}`,
                [schema.images.data.name]: dataUri,
                [schema.images.order.name]: maxOrder + 1,
              });
            }
          }
        }
      } catch (dbError) {
        console.error("Error saving to database:", dbError);
        // Continue even if DB save fails - file is already uploaded
      }
    }

    return NextResponse.json({ 
      success: true, 
      path: dataUri, // Return data URI instead of file path
      filename 
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

