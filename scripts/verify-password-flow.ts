import { hashPasswordClient, verifyPasswordHash, hashPasswordForStorage } from "../lib/auth";
import { config } from "dotenv";

// Load .env.local first (takes precedence), then .env
config({ path: ".env.local" });
config();

async function main() {
  const password = "1234";
  const clientHash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
  const storedHash = process.env.ADMIN_PASSWORD_HASH;

  console.log("=".repeat(60));
  console.log("Password Verification Flow Test");
  console.log("=".repeat(60));
  
  console.log("\n1️⃣ Password:", password);
  
  // Step 1: Generate SHA-256 hash (what client does)
  const serverGeneratedHash = hashPasswordClient(password);
  console.log("\n2️⃣ Server-generated SHA-256 hash:", serverGeneratedHash);
  console.log("   Client-provided SHA-256 hash:  ", clientHash);
  console.log("   Match:", serverGeneratedHash === clientHash ? "✅ YES" : "❌ NO");
  
  if (serverGeneratedHash !== clientHash) {
    console.log("\n⚠️  WARNING: Client and server hashes don't match!");
    console.log("   This could indicate a hashing implementation difference.");
  }
  
  // Step 2: Check stored hash
  if (!storedHash) {
    console.log("\n❌ ADMIN_PASSWORD_HASH is not set in environment variables");
    console.log("   Check your .env.local file");
    process.exit(1);
  }
  
  console.log("\n3️⃣ Stored ADMIN_PASSWORD_HASH:", storedHash);
  console.log("   Length:", storedHash.length, "characters");
  console.log("   Starts with:", storedHash.substring(0, 7));
  
  // Step 3: Generate what the stored hash should be
  console.log("\n4️⃣ Generating what the stored hash SHOULD be:");
  const correctStoredHash = await hashPasswordForStorage(password);
  console.log("   Generated hash:", correctStoredHash);
  console.log("   Matches stored:", correctStoredHash === storedHash ? "✅ YES" : "❌ NO");
  
  // Step 4: Verify using the client hash
  console.log("\n5️⃣ Verifying client hash against stored hash:");
  console.log("   Using client hash:", clientHash);
  
  // Temporarily set the hash for verification
  const originalHash = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = storedHash;
  
  const isValid = await verifyPasswordHash(clientHash);
  
  if (isValid) {
    console.log("   Result: ✅ VALID - Password hash matches!");
  } else {
    console.log("   Result: ❌ INVALID - Password hash does not match!");
    console.log("\n🔍 Debugging:");
    console.log("   - Client sends SHA-256 hash:", clientHash);
    console.log("   - Server compares this against bcrypt hash:", storedHash);
    console.log("   - The stored hash should be: bcrypt(SHA-256('1234'))");
    console.log("\n💡 Solution:");
    console.log("   1. Generate a new hash: bun run scripts/generate-password-hash.ts 1234");
    console.log("   2. Update ADMIN_PASSWORD_HASH in .env.local with the generated hash");
  }
  
  // Restore original
  process.env.ADMIN_PASSWORD_HASH = originalHash;
  
  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

