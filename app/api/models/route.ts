import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq, asc } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";

config();

// Helper function to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

export async function GET() {
  // GET doesn't require auth (read-only)
  try {
    const db = getDb();
    if (!db) {
      // Database not configured, return empty array
      return NextResponse.json([]);
    }
    
    // Single query with LEFT JOIN to get all models with their images
    const rows = await db
      .select({
        modelId: schema.models.id,
        slug: schema.models.slug,
        name: schema.models.name,
        stats: schema.models.stats,
        instagram: schema.models.instagram,
        featuredImage: schema.models.featuredImage,
        displayOrder: schema.models.displayOrder,
        imageId: schema.images.id,
        imageType: schema.images.type,
        imageSrc: schema.images.src,
        imageAlt: schema.images.alt,
        imageData: schema.images.data,
        imageOrder: schema.images.order,
      })
      .from(schema.models)
      .leftJoin(schema.images, eq(schema.models.id, schema.images.modelId))
      .orderBy(asc(schema.models.displayOrder), asc(schema.images.order));
    
    // Group by model and collect images
    const modelsMap = new Map<number, any>();
    
    for (const row of rows) {
      if (!modelsMap.has(row.modelId)) {
        // Use base64 data if available, otherwise use featuredImage as-is
        let featuredImageSrc = row.featuredImage || "";
        if (featuredImageSrc && !featuredImageSrc.startsWith("data:")) {
          featuredImageSrc = featuredImageSrc.startsWith("/models/")
            ? `/api/images/serve${featuredImageSrc}`
            : featuredImageSrc;
        }
        
        modelsMap.set(row.modelId, {
          id: String(row.modelId), // Convert to string for frontend
          slug: row.slug,
          name: row.name,
          stats: row.stats,
          instagram: row.instagram || undefined,
          featuredImage: featuredImageSrc,
          displayOrder: row.displayOrder,
          gallery: [],
        });
      }
      
      // Add image to gallery if it exists
      if (row.imageId) {
        const model = modelsMap.get(row.modelId)!;
        // Use base64 data if available, otherwise fallback to path/API route
        let imageSrc = row.imageData || row.imageSrc;
        if (imageSrc && !imageSrc.startsWith("data:")) {
          imageSrc = imageSrc.startsWith("/models/")
            ? `/api/images/serve${imageSrc}`
            : imageSrc;
        }
        model.gallery.push({
          id: row.imageId,
          type: row.imageType,
          src: imageSrc || row.imageSrc,
          alt: row.imageAlt,
        });
      }
    }
    
    // Convert to array and sort by display order
    const models = Array.from(modelsMap.values()).sort((a, b) => {
      return a.displayOrder - b.displayOrder;
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error("Error fetching models:", error);
    // Return empty array instead of error object to prevent frontend issues
    return NextResponse.json([]);
  }
}

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
    
    // Remove passwordHash and id from body before processing (id is auto-generated)
    const { passwordHash, id, ...modelData } = body;

    // Auto-generate slug from name if not provided
    let modelSlug = modelData.slug;
    if (!modelSlug && modelData.name) {
      modelSlug = generateSlug(modelData.name);
      
      // Ensure slug is unique
      let uniqueSlug = modelSlug;
      let counter = 1;
      while (true) {
        const existing = await db
          .select()
          .from(schema.models)
          .where(eq(schema.models.slug, uniqueSlug))
          .limit(1);
        
        if (existing.length === 0) {
          break;
        }
        uniqueSlug = `${modelSlug}-${counter}`;
        counter++;
      }
      modelSlug = uniqueSlug;
    }

    // Get the max display order and add 1 for the new model
    const existingModels = await db
      .select({ displayOrder: schema.models.displayOrder })
      .from(schema.models);
    
    const maxOrder = existingModels.length > 0
      ? Math.max(...existingModels.map((m) => m.displayOrder))
      : -1;

    const newModel = await db
      .insert(schema.models)
      .values({
        slug: modelSlug,
        name: modelData.name,
        stats: modelData.stats,
        instagram: modelData.instagram || null,
        featuredImage: modelData.featuredImage || null, // Base64 data URI
        displayOrder: maxOrder + 1,
      })
      .returning();

    const modelId = newModel[0].id;

    // Insert gallery images if provided
    if (modelData.gallery && Array.isArray(modelData.gallery)) {
      const imagesToInsert = modelData.gallery
        .filter((img: any) => img.data) // Only insert images with base64 data
        .map((img: any, index: number) => ({
          id: randomUUID(),
          modelId: modelId,
          type: img.type || "image",
          src: img.src || "", // Temporary src, will be updated
          alt: img.alt || `${modelData.name} - ${index + 1}`,
          data: img.data, // Base64 data
          order: index,
        }));

      if (imagesToInsert.length > 0) {
        await db.insert(schema.images).values(imagesToInsert);
      }
    }

    // Convert ID to string for frontend compatibility
    const responseModel = {
      ...newModel[0],
      id: String(newModel[0].id),
    };

    return NextResponse.json(responseModel, { status: 201 });
  } catch (error) {
    console.error("Error creating model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}

