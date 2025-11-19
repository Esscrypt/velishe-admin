import { hashPasswordClient, verifyPasswordHash } from "../lib/auth";
import { config } from "dotenv";
import { readFileSync } from "node:fs";

// Load .env.local first (takes precedence), then .env
config({ path: ".env.local" });
config();

async function main() {
  const password = "1234";
  const clientHash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
  
  console.log("=".repeat(70));
  console.log("Password Verification Test");
  console.log("=".repeat(70));
  
  // Read .env.local directly
  let envLocalHash: string | null = null;
  try {
    const envContent = readFileSync(".env.local", "utf-8");
    const match = envContent.match(/ADMIN_PASSWORD_HASH=(.+)/);
    if (match) {
      envLocalHash = match[1].trim();
    }
  } catch (error) {
    console.log("Could not read .env.local file");
  }
  
  console.log("\n1️⃣ Password:", password);
  console.log("\n2️⃣ Client SHA-256 hash:", clientHash);
  
  // Verify server generates same hash
  const serverHash = hashPasswordClient(password);
  console.log("   Server SHA-256 hash:  ", serverHash);
  console.log("   Match:", serverHash === clientHash ? "✅ YES" : "❌ NO");
  
  // Check environment variable
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  console.log("\n3️⃣ Environment variable ADMIN_PASSWORD_HASH:");
  if (envHash) {
    console.log("   ✅ Found:", envHash.substring(0, 20) + "...");
    console.log("   Length:", envHash.length);
  } else {
    console.log("   ❌ Not found in process.env");
  }
  
  // Check .env.local directly
  if (envLocalHash) {
    console.log("\n4️⃣ .env.local file ADMIN_PASSWORD_HASH:");
    console.log("   ✅ Found:", envLocalHash.substring(0, 20) + "...");
    console.log("   Length:", envLocalHash.length);
    
    // Use the hash from .env.local for verification
    process.env.ADMIN_PASSWORD_HASH = envLocalHash;
  }
  
  // Now verify
  console.log("\n5️⃣ Verification Test:");
  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.log("   ❌ Cannot verify - ADMIN_PASSWORD_HASH not set");
    console.log("\n💡 Solution:");
    console.log("   1. Run: bun run scripts/generate-password-hash.ts 1234");
    console.log("   2. Copy the generated hash to .env.local");
    console.log("   3. Make sure .env.local is in the project root");
    process.exit(1);
  }
  
  console.log("   Comparing client hash against stored bcrypt hash...");
  const isValid = await verifyPasswordHash(clientHash);
  
  if (isValid) {
    console.log("   ✅ SUCCESS - Password hash is VALID!");
    console.log("\n✅ The password '1234' should work correctly.");
  } else {
    console.log("   ❌ FAILED - Password hash is INVALID!");
    console.log("\n🔍 The issue:");
    console.log("   - Client sends SHA-256 hash:", clientHash);
    console.log("   - Server compares against bcrypt hash:", process.env.ADMIN_PASSWORD_HASH.substring(0, 20) + "...");
    console.log("   - The stored hash should be: bcrypt(SHA-256('1234'))");
    console.log("\n💡 Solution:");
    console.log("   1. Generate new hash: bun run scripts/generate-password-hash.ts 1234");
    console.log("   2. Update .env.local: ADMIN_PASSWORD_HASH=<generated-hash>");
    console.log("   3. Restart your dev server");
  }
  
  console.log("\n" + "=".repeat(70));
}

main().catch(console.error);

