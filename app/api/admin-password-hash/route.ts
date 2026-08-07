import { NextResponse } from "next/server";
import { getAdminPasswordHash } from "@/lib/auth";

export async function GET() {
  const hash = getAdminPasswordHash();

  if (!hash) {
    return NextResponse.json(
      { error: "Admin password hash is not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ hash });
}
