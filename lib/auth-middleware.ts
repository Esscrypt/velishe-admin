import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordHash } from "./auth";

const PASSWORD_HASH_HEADER = "x-admin-password-hash";

/**
 * Middleware to verify password hash from request body or header.
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
    let body: { passwordHash?: string; [key: string]: unknown };
    let headerHash: string | null = null;

    if (requestOrBody instanceof NextRequest) {
      headerHash = requestOrBody.headers.get(PASSWORD_HASH_HEADER);
      try {
        body = await requestOrBody.json();
      } catch {
        body = {};
      }
    } else {
      body = requestOrBody;
    }

    const passwordHash =
      (typeof body.passwordHash === "string" && body.passwordHash) ||
      headerHash ||
      undefined;

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
    console.log("[verifyAuth] Password hash verification result:", isValid);
    if (!isValid) {
      console.log("[verifyAuth] Returning 401 - Invalid password");
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        ),
      };
    }

    console.log("[verifyAuth] Authentication successful");
    return { authorized: true, body: { ...body, passwordHash } };
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
