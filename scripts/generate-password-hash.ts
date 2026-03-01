import { hashPasswordForStorage } from "../lib/auth";

async function main() {
  const password = process.argv[2]?.trim();

  if (!password) {
    console.error("Usage: bun run scripts/generate-password-hash.ts <password>");
    console.error("Example: bun run scripts/generate-password-hash.ts mypassword");
    process.exit(1);
  }

  try {
    const hash = await hashPasswordForStorage(password);
    console.log("\n Password hash generated:");
    console.log(hash);
    console.log("\n📝 Add this to your .env.local file (IMPORTANT: Use quotes!):");
    console.log(`ADMIN_PASSWORD_HASH="${hash}"\n`);
    console.log("⚠️  The quotes are required because bcrypt hashes contain $ characters");
  } catch (error) {
    console.error("Error generating hash:", error);
    process.exit(1);
  }
}

main();

