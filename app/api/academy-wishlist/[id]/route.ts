import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, eq } from "@/lib/db";
import type { AcademyWishlistEntryRow } from "@/lib/db/schema";
import { verifyAuth } from "@/lib/auth-middleware";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = Number.parseInt(id, 10);
    if (Number.isNaN(entryId)) {
      return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });
    }
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    const rows = await db
      .select()
      .from(schema.academyWishlistEntries)
      .where(eq(schema.academyWishlistEntries.id, entryId))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    const row = rows[0];
    return NextResponse.json({
      id: row.id,
      email: row.email,
      phoneNumber: row.phoneNumber,
      emailSent: row.emailSent,
      confirmed: row.confirmed,
      createdAt: row.createdAt,
    });
  } catch (error) {
    console.error("[GET /api/academy-wishlist/:id]", error);
    return NextResponse.json(
      { error: "Failed to fetch academy wishlist entry" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json() as {
      passwordHash?: string;
      email?: string;
      phoneNumber?: string;
      emailSent?: boolean;
      confirmed?: boolean;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }
    const { id } = await params;
    const entryId = Number.parseInt(id, 10);
    if (Number.isNaN(entryId)) {
      return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });
    }
    const payload = body as {
      email?: string;
      phoneNumber?: string;
      emailSent?: boolean;
      confirmed?: boolean;
    };
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    const setPayload: Partial<AcademyWishlistEntryRow> = {};
    if (typeof payload.email === "string") setPayload.email = payload.email.trim();
    if (typeof payload.phoneNumber === "string") setPayload.phoneNumber = payload.phoneNumber.trim();
    if (typeof payload.emailSent === "boolean") setPayload.emailSent = payload.emailSent;
    if (typeof payload.confirmed === "boolean") setPayload.confirmed = payload.confirmed;
    if (Object.keys(setPayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    const updated = await db
      .update(schema.academyWishlistEntries)
      .set(setPayload)
      .where(eq(schema.academyWishlistEntries.id, entryId))
      .returning();
    if (updated.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    const row = updated[0];
    return NextResponse.json({
      id: row.id,
      email: row.email,
      phoneNumber: row.phoneNumber,
      emailSent: row.emailSent,
      confirmed: row.confirmed,
      createdAt: row.createdAt,
    });
  } catch (error) {
    console.error("[PUT /api/academy-wishlist/:id]", error);
    return NextResponse.json(
      { error: "Failed to update academy wishlist entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json() as { passwordHash?: string };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) {
      return authResult.response!;
    }
    const { id } = await params;
    const entryId = Number.parseInt(id, 10);
    if (Number.isNaN(entryId)) {
      return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });
    }
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    const deleted = await db
      .delete(schema.academyWishlistEntries)
      .where(eq(schema.academyWishlistEntries.id, entryId))
      .returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/academy-wishlist/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete academy wishlist entry" },
      { status: 500 }
    );
  }
}
