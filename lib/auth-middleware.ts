import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordHash } from "./auth";

/**
 * Middleware to verify password hash from request body
 * Expects a passwordHash field (SHA-256 hash from client)
 * Can accept either a NextRequest (will parse body) or a parsed body object
 */
export async function verifyAuth(
  requestOrBody: NextRequest | { passwordHash?: string }
): Promise<{
  authorized: boolean;
  response?: NextResponse;
  body?: any;
}> {
  try {
    // If it's a request, parse the body. Otherwise, use the provided body.
    const body = requestOrBody instanceof NextRequest
      ? await requestOrBody.json()
      : requestOrBody;
    
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

    return { authorized: true, body };
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

