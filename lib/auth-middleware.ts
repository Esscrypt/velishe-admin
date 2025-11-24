import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordHash } from "./auth";

/**
 * Middleware to verify password hash from request body
 * Expects a passwordHash field (SHA-256 hash from client)
 */
export async function verifyAuth(request: NextRequest): Promise<{
  authorized: boolean;
  response?: NextResponse;
}> {
  try {
    const body = await request.json();
    const passwordHash = body.passwordHash;

    if (!passwordHash) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Password hash is required" },
          { status: 401 }
        ),
      };
    }

    const isValid = await verifyPasswordHash(passwordHash);
    if (!isValid) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        ),
      };
    }

    return { authorized: true };
  } catch (error) {
    console.error("Error verifying auth:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      ),
    };
  }
}

