import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordHash } from "./auth";

/**
 * Middleware to verify password hash from request body
 * Expects a passwordHash field (SHA-256 hash from client)
 * Returns the parsed body so it can be reused in the route handler
 */
export async function verifyAuth(request: NextRequest): Promise<{
  authorized: boolean;
  response?: NextResponse;
  body?: any;
}> {
  try {
    // Read the request body as text first, then parse it
    // This allows us to parse it multiple times if needed
    const bodyText = await request.text();
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      // If body is not JSON, return error
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        ),
      };
    }
    
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

