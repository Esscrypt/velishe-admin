import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import { triggerRevalidation } from "@/lib/revalidate";
import { config } from "dotenv";

config();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { mainboard, development } = body as {
      mainboard?: string[];
      development?: string[];
    };
    if (!Array.isArray(mainboard) || !Array.isArray(development)) {
      return NextResponse.json(
        { error: "mainboard and development id arrays are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database connection not available" }, { status: 500 });
    }

    await db.transaction(async (tx) => {
      let order = 0;
      const apply = async (ids: string[], board: "mainboard" | "development") => {
        for (const rawId of ids) {
          const modelId = Number.parseInt(rawId, 10);
          if (Number.isNaN(modelId)) continue;
          await tx
            .update(schema.models)
            .set({ board, displayOrder: order } as any)
            .where(eq(schema.models.id, modelId));
          order += 1;
        }
      };
      await apply(mainboard, "mainboard");
      await apply(development, "development");
    });

    await triggerRevalidation();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving board layout:", error);
    return NextResponse.json({ error: "Failed to save board layout" }, { status: 500 });
  }
}
