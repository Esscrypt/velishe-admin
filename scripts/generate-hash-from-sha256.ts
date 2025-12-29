import bcrypt from "bcryptjs";

async function main() {
  const sha256Hash = process.argv[2]?.trim();

  if (!sha256Hash) {
    console.error("Usage: bun run scripts/generate-hash-from-sha256.ts <sha256-hash>");
    console.error("Example: bun run scripts/generate-hash-from-sha256.ts 2595b9f3cf887a05f5dd6a92e56203b9827839ae07f7fe9070da99f918175c3d");
    process.exit(1);
  }

  // Validate it's a SHA-256 hash (64 hex characters)
  if (!/^[0-9a-f]{64}$/i.test(sha256Hash)) {
    console.error("Error: Input must be a valid SHA-256 hash (64 hex characters)");
    process.exit(1);
  }

  try {
    // Directly bcrypt the SHA-256 hash (this is what ADMIN_PASSWORD_HASH should be)
    // This matches what hashPasswordForStorage does: bcrypt(SHA-256(password))
    const saltRounds = 10;
    const bcryptHash = await bcrypt.hash(sha256Hash, saltRounds);
    console.log("\n✅ Bcrypt hash generated from SHA-256 hash:");
    console.log(bcryptHash);
    console.log("\n📝 Add this to your .env.local file (IMPORTANT: Use quotes!):");
    console.log(`ADMIN_PASSWORD_HASH="${bcryptHash}"\n`);
    console.log("⚠️  Remember to restart your dev server after updating .env.local");
    console.log("⚠️  The quotes are required because bcrypt hashes contain $ characters");
  } catch (error) {
    console.error("Error generating hash:", error);
    process.exit(1);
  }
}

main();

