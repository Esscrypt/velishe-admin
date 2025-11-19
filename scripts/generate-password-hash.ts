import { hashPasswordForStorage, hashPasswordClient } from "../lib/auth";

async function main() {
  // Get password from command line, trim whitespace
  const password = process.argv[2]?.trim();

  if (!password) {
    console.error("Usage: bun run scripts/generate-password-hash.ts <password>");
    console.error("Example: bun run scripts/generate-password-hash.ts mypassword");
    process.exit(1);
  }

  // Warn if password is empty after trimming
  if (password.length === 0) {
    console.error("❌ Error: Password cannot be empty");
    process.exit(1);
  }

  try {
    // Show what we're hashing
    console.log("=".repeat(60));
    console.log("Password Hash Generator");
    console.log("=".repeat(60));
    console.log(`\n📝 Password: "${password}"`);
    console.log(`   Length: ${password.length} characters`);
    
    // Generate SHA-256 hash (what client sends)
    const sha256Hash = hashPasswordClient(password);
    console.log(`\n1️⃣ SHA-256 hash (what client sends):`);
    console.log(`   ${sha256Hash}`);
    
    // Generate bcrypt hash of SHA-256 (what we store)
    const hash = await hashPasswordForStorage(password);
    console.log(`\n2️⃣ Bcrypt hash of SHA-256 (what we store):`);
    console.log(`   ${hash}`);
    
    console.log(`\n✅ Password hash generated successfully!`);
    console.log(`\n📝 Add this to your .env.local file:`);
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log(`\n⚠️  IMPORTANT: Restart your dev server after updating .env.local`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error generating hash:", error);
    process.exit(1);
  }
}

main();

