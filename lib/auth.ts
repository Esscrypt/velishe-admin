import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { createHash } from "node:crypto";

// Load .env.local first (takes precedence), then .env
config({ path: ".env.local" });
config();

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!ADMIN_PASSWORD_HASH) {
  console.warn("ADMIN_PASSWORD_HASH not set in environment variables");
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

