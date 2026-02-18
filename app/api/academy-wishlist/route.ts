import { NextRequest, NextResponse } from "next/server";
import { getDb, schema, asc } from "@/lib/db";
import type { AcademyWishlistEntryInsert } from "@/lib/db/schema";
import { verifyAuth } from "@/lib/auth-middleware";

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const numericLength = phoneNumber.replace(/\D/g, "").length;
  return phoneRegex.test(phoneNumber) && numericLength >= 7 && numericLength <= 20;
}

export async function GET() {
  try {
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
      .orderBy(asc(schema.academyWishlistEntries.createdAt));
    const entries = rows.map((row) => ({
      id: row.id,
      email: row.email,
      phoneNumber: row.phoneNumber,
      emailSent: row.emailSent,
      confirmed: row.confirmed,
      createdAt: row.createdAt,
    }));
    return NextResponse.json(entries);
  } catch (error) {
    console.error("[GET /api/academy-wishlist]", error);
    return NextResponse.json(
      { error: "Failed to fetch academy wishlist entries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const payload = body as {
      email?: string;
      phoneNumber?: string;
      emailSent?: boolean;
      confirmed?: boolean;
    };
    if (!payload || typeof payload.email !== "string" || typeof payload.phoneNumber !== "string") {
      return NextResponse.json(
        { error: "Invalid request body: email and phoneNumber required" },
        { status: 400 }
      );
    }
    const email = payload.email.trim();
    const phoneNumber = payload.phoneNumber.trim();
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }
    if (!validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "Please provide a valid phone number" },
        { status: 400 }
      );
    }
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    const inserted = await db
      .insert(schema.academyWishlistEntries)
      .values({
        email,
        phoneNumber,
        emailSent: payload.emailSent ?? false,
        confirmed: payload.confirmed ?? false,
      } as AcademyWishlistEntryInsert)
      .returning();
    const row = inserted[0];
    return NextResponse.json(
      {
        id: row.id,
        email: row.email,
        phoneNumber: row.phoneNumber,
        emailSent: row.emailSent,
        confirmed: row.confirmed,
        createdAt: row.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/academy-wishlist]", error);
    return NextResponse.json(
      { error: "Failed to create academy wishlist entry" },
      { status: 500 }
    );
  }
}
