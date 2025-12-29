import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq, asc, inArray, and } from "@/lib/db";
import type { ModelInsert } from "@/lib/db/schema";
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

export async function GET(request: NextRequest) {
  // GET doesn't require auth (read-only)
  try {
    const db = getDb();
    
    if (!db) {
      console.error("[GET /api/models] Database connection not available");
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 });
    }
    
    // Parse pagination parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    
    const modelLimit = limitParam ? Number.parseInt(limitParam, 10) : 10;
    const modelOffset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;
    
    // Validate pagination parameters
    if (limitParam && (Number.isNaN(modelLimit) || modelLimit < 1)) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
        { status: 400 }
      );
    }
    
    if (offsetParam && (Number.isNaN(modelOffset) || modelOffset < 0)) {
      return NextResponse.json(
        { error: "Invalid offset parameter" },
        { status: 400 }
      );
    }
    
    // Get models with pagination, ordered by displayOrder
    const modelsQuery = db
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
        displayOrder: schema.models.displayOrder,
      })
      .from(schema.models)
      .orderBy(asc(schema.models.displayOrder))
      .limit(modelLimit)
      .offset(modelOffset);
    
    const modelRows = await modelsQuery;
    
    if (modelRows.length === 0) {
      return NextResponse.json([]);
    }
    
    const modelIds = modelRows.map(row => row.modelId);
    
    // Get only the featured image (order 0) for each model
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
        displayOrder: schema.models.displayOrder,
        imageId: schema.images.id,
        imageData: schema.images.data,
        imageOrder: schema.images.order,
      })
      .from(schema.models)
      .leftJoin(
        schema.images,
        // Only join featured images (order 0)
        and(
          eq(schema.models.id, schema.images.modelId),
          eq(schema.images.order, 0)
        )
      )
      .where(
        // Only get models in our limited set
        inArray(schema.models.id, modelIds)
      )
      .orderBy(asc(schema.models.displayOrder));
    
    console.log(`[GET /api/models] Found ${rows.length} rows from database`);
    
    // Group by model and collect only the featured image (order 0)
    const modelsMap = new Map<number, any>();
    
    for (const row of rows) {
      if (!row.modelId) {
        console.warn("[GET /api/models] Skipping row without modelId");
        continue;
      }
      
      if (!modelsMap.has(row.modelId)) {
        modelsMap.set(row.modelId, {
          id: String(row.modelId),
          slug: row.slug || "",
          name: row.name || "",
          stats: {
            height: row.height || "",
            bust: row.bust || "",
            waist: row.waist || "",
            hips: row.hips || "",
            shoeSize: row.shoeSize || "",
            hairColor: row.hairColor || "",
            eyeColor: row.eyeColor || "",
          },
          instagram: row.instagram || undefined,
          featuredImage: "", // Will be set from images
          featuredImageId: "",
          displayOrder: row.displayOrder ?? 0,
          gallery: [], // Empty gallery - only featured image is loaded
        });
      }
      
      // Only set featured image (order 0)
      if (row.imageId && row.imageData && row.imageOrder === 0) {
        const model = modelsMap.get(row.modelId)!;
        model.featuredImage = row.imageData;
        model.featuredImageId = row.imageId;
      }
    }
    
    // Convert to array and sort by display order
    const models = Array.from(modelsMap.values()).sort((a, b) => {
      return a.displayOrder - b.displayOrder;
    });

    console.log(`[GET /api/models] Returning ${models.length} models`);
    return NextResponse.json(models);
  } catch (error) {
    console.error("[GET /api/models] Error fetching models:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    // Return error details in development, empty array in production
    return NextResponse.json(
      { error: "Failed to fetch models", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse body once
    const body = await request.json();
    
    // Verify password using parsed body
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }
    
    const db = getDb();
    
    if (!db) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 });
    }
    
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
          .select({ id: schema.models.id })
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
      ? Math.max(...existingModels.map((m) => m.displayOrder ?? 0))
      : -1;

    // Allow creating model with all fields nullable
    // All fields can be set later via PUT
    const newModel = await db
      .insert(schema.models)
      .values({
        slug: modelSlug || null,
        name: modelData.name || null,
        height: modelData.stats?.height || null,
        bust: modelData.stats?.bust || null,
        waist: modelData.stats?.waist || null,
        hips: modelData.stats?.hips || null,
        shoeSize: modelData.stats?.shoeSize || null,
        hairColor: modelData.stats?.hairColor || null,
        eyeColor: modelData.stats?.eyeColor || null,
        instagram: modelData.instagram || null,
        displayOrder: modelData.displayOrder ?? (maxOrder + 1),
      } as ModelInsert)
      .returning();

    const modelId = newModel[0].id;

    // Insert gallery images if provided
    if (modelData.gallery && Array.isArray(modelData.gallery)) {
      const imagesToInsert = modelData.gallery
        .filter((img: any) => img.data) // Only insert images with base64 data
        .map((img: any, index: number) => ({
          id: randomUUID(),
          modelId: modelId,
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

