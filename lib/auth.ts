import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { createHash } from "node:crypto";

// Load .env.local first (takes precedence), then .env
// Force reload to avoid caching issues - override existing values
const envResult = config({ path: ".env.local", override: true });
config({ override: true });

// Read the hash after loading
let ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// Debug logging to diagnose issues
if (typeof window === "undefined") {
  if (!ADMIN_PASSWORD_HASH) {
    console.warn("[auth] ADMIN_PASSWORD_HASH not set in environment variables");
    if (envResult.error) {
      console.error("[auth] Error loading .env.local:", envResult.error);
    }
    // Check if .env.local exists
    try {
      const fs = require("fs");
      const envContent = fs.readFileSync(".env.local", "utf-8");
      const hasAdminHash = envContent.includes("ADMIN_PASSWORD_HASH");
      console.log("[auth] .env.local exists:", true);
      console.log("[auth] Contains ADMIN_PASSWORD_HASH:", hasAdminHash);
      if (hasAdminHash) {
        const match = envContent.match(/ADMIN_PASSWORD_HASH=(.+)/);
        if (match) {
          console.log("[auth] Raw line value length:", match[1]?.length);
          console.log("[auth] Raw line first 30 chars:", match[1]?.substring(0, 30));
        }
      }
    } catch (e) {
      console.log("[auth] Could not read .env.local file");
    }
  } else {
    console.log("[auth] ADMIN_PASSWORD_HASH loaded successfully");
    console.log("[auth] Length:", ADMIN_PASSWORD_HASH.length);
    console.log("[auth] First 30 chars:", ADMIN_PASSWORD_HASH.substring(0, 30));
    console.log("[auth] Starts with $2:", ADMIN_PASSWORD_HASH.startsWith("$2"));
  }
}

/**
 * Hash a password string using SHA-256 (for client-side hashing)
 */
export function hashPasswordClient(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Verify if the provided password hash (from client) matches the admin password hash
 * The client sends a SHA-256 hash, which we then hash with bcrypt and compare
 */
export async function verifyPasswordHash(passwordHash: string): Promise<boolean> {
  if (!ADMIN_PASSWORD_HASH) {
    console.error("ADMIN_PASSWORD_HASH not configured");
    return false;
  }

  try {
    // The ADMIN_PASSWORD_HASH should be a bcrypt hash of the SHA-256 hash
    return await bcrypt.compare(passwordHash, ADMIN_PASSWORD_HASH);
  } catch (error) {
    console.error("Error verifying password hash:", error);
    return false;
  }
}

/**
 * Hash a password for storage (useful for generating the initial hash)
 * This creates a bcrypt hash of the SHA-256 hash of the password
 */
export async function hashPasswordForStorage(password: string): Promise<string> {
  const sha256Hash = hashPasswordClient(password);
  const saltRounds = 10;
  return await bcrypt.hash(sha256Hash, saltRounds);
}

