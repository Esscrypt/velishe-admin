import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { createHash } from "node:crypto";

// Load .env.local first (takes precedence), then .env
// Disable variable substitution to prevent $ from being interpreted as variables
config({ path: ".env.local", processEnv: {} });
config({ processEnv: {} });

// Function to get the password hash (allows for runtime updates)
function getAdminPasswordHash(): string | undefined {
  return process.env.ADMIN_PASSWORD_HASH;
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
  const adminPasswordHash = getAdminPasswordHash();
  
  if (!adminPasswordHash) {
    console.error("ADMIN_PASSWORD_HASH not configured");
    return false;
  }

  try {
    // The ADMIN_PASSWORD_HASH should be a bcrypt hash of the SHA-256 hash
    const isValid = await bcrypt.compare(passwordHash, adminPasswordHash);
    
    if (!isValid) {
      console.error("Password hash verification failed");
      console.error("  Provided hash:", passwordHash);
      console.error("  Stored hash:", adminPasswordHash.substring(0, 20) + "...");
    }
    
    return isValid;
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

