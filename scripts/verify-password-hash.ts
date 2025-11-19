import { hashPasswordClient, verifyPasswordHash } from "../lib/auth";

async function main() {
  const password = process.argv[2];
  const storedHash = process.argv[3];

  if (!password || !storedHash) {
    console.error("Usage: bun run scripts/verify-password-hash.ts <password> <stored-hash>");
    console.error("Example: bun run scripts/verify-password-hash.ts 1234 $2a$10$...");
    process.exit(1);
  }

  try {
    // First, hash the password with SHA-256 (as the client would)
    const sha256Hash = hashPasswordClient(password);
    console.log(`\n📝 SHA-256 hash of "${password}":`);
    console.log(sha256Hash);

    // Temporarily set the hash in environment for verification
    // Need to import and set it before importing auth module
    const originalHash = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = storedHash;
    
    // Re-import to get the updated hash
    const { verifyPasswordHash: verifyWithHash } = await import("../lib/auth");

    // Now verify using the SHA-256 hash
    const isValid = await verifyWithHash(sha256Hash);
    
    if (isValid) {
      console.log("\n✅ Password hash is VALID!");
    } else {
      console.log("\n❌ Password hash is INVALID!");
      console.log("\n💡 Make sure:");
      console.log("   1. The stored hash was generated from the same password");
      console.log("   2. ADMIN_PASSWORD_HASH is set correctly in your .env.local file");
    }
  } catch (error) {
    console.error("Error verifying hash:", error);
    process.exit(1);
  }
}

main();

