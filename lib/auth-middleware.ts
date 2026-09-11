import { NextRequest, NextResponse } from "next/server";
import { verifyPasswordHash } from "./auth";

const PASSWORD_HASH_HEADER = "x-admin-password-hash";

function isRequestLike(
  value: unknown,
): value is Pick<NextRequest, "json" | "headers"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "headers" in value &&
    typeof (value as { json?: unknown }).json === "function"
  );
}

/**
 * Verify password hash from request body and/or header.
 * Avoid `instanceof NextRequest` — it fails across Next.js module boundaries.
 */
export async function verifyAuth(
  requestOrBody: NextRequest | { passwordHash?: string },
): Promise<{
  authorized: boolean;
  response?: NextResponse;
  body?: any;
}> {
  try {
    let body: { passwordHash?: string; [key: string]: unknown } = {};
    let headerHash: string | null = null;

    if (isRequestLike(requestOrBody)) {
      headerHash = requestOrBody.headers.get(PASSWORD_HASH_HEADER);
      try {
        const parsed = await requestOrBody.json();
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          body = parsed as { passwordHash?: string; [key: string]: unknown };
        }
      } catch {
        body = {};
      }
    } else if (
      requestOrBody &&
      typeof requestOrBody === "object" &&
      !Array.isArray(requestOrBody)
    ) {
      body = requestOrBody as { passwordHash?: string; [key: string]: unknown };
    }

    const passwordHash =
      (typeof body.passwordHash === "string" && body.passwordHash.trim()) ||
      (typeof headerHash === "string" && headerHash.trim()) ||
      undefined;

    if (!passwordHash) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Password hash is required" },
          { status: 401 },
        ),
      };
    }

    const isValid = await verifyPasswordHash(passwordHash);
    if (!isValid) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Invalid password" },
          { status: 401 },
        ),
      };
    }

    return { authorized: true, body: { ...body, passwordHash } };
  } catch (error) {
    console.error("Error verifying auth:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      ),
    };
  }
}
