import { verifyPasswordHash, hashPasswordClient } from "../lib/auth";
import { readFileSync } from "node:fs";

async function main() {
  const password = "1234";
  const expectedClientHash = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
  
  console.log("=".repeat(70));
  console.log("Password Verification Debug");
  console.log("=".repeat(70));
  
  // Step 1: Verify client hash generation
  const serverHash = hashPasswordClient(password);
  console.log("\n1️⃣ Hash Generation:");
  console.log("   Expected (client):", expectedClientHash);
  console.log("   Generated (server):", serverHash);
  console.log("   Match:", serverHash === expectedClientHash ? "✅ YES" : "❌ NO");
  
  // Step 2: Check environment variable
  console.log("\n2️⃣ Environment Variable:");
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (envHash) {
    console.log("   ✅ Found in process.env");
    console.log("   Value:", envHash.substring(0, 30) + "...");
    console.log("   Length:", envHash.length);
  } else {
    console.log("   ❌ Not found in process.env");
  }
  
  // Step 3: Check .env.local file
  console.log("\n3️⃣ .env.local File:");
  try {
    const envContent = readFileSync(".env.local", "utf-8");
    const match = envContent.match(/ADMIN_PASSWORD_HASH=(.+)/);
    if (match) {
      const fileHash = match[1].trim();
      console.log("   ✅ Found in .env.local");
      console.log("   Value:", fileHash.substring(0, 30) + "...");
      console.log("   Length:", fileHash.length);
      
      // Set it if not in process.env
      if (!envHash) {
        process.env.ADMIN_PASSWORD_HASH = fileHash;
        console.log("   ✅ Set process.env.ADMIN_PASSWORD_HASH from file");
      } else if (envHash !== fileHash) {
        console.log("   ⚠️  WARNING: process.env differs from .env.local!");
        console.log("   process.env:", envHash.substring(0, 30) + "...");
        console.log("   .env.local: ", fileHash.substring(0, 30) + "...");
      }
    } else {
      console.log("   ❌ ADMIN_PASSWORD_HASH not found in .env.local");
    }
  } catch (error) {
    console.log("   ❌ Could not read .env.local:", error);
  }
  
  // Step 4: Test verification
  console.log("\n4️⃣ Verification Test:");
  const currentHash = process.env.ADMIN_PASSWORD_HASH;
  if (!currentHash) {
    console.log("   ❌ Cannot test - ADMIN_PASSWORD_HASH not available");
    console.log("\n💡 Solution:");
    console.log("   1. Make sure .env.local exists in the project root");
    console.log("   2. Run: bun run scripts/fix-password-hash.ts 1234");
    console.log("   3. Restart your Next.js dev server");
    process.exit(1);
  }
  
  console.log("   Testing hash:", expectedClientHash);
  console.log("   Against stored:", currentHash.substring(0, 30) + "...");
  
  const isValid = await verifyPasswordHash(expectedClientHash);
  
  if (isValid) {
    console.log("   Result: ✅ VALID - Password '1234' should work!");
  } else {
    console.log("   Result: ❌ INVALID");
    console.log("\n🔍 Debugging:");
    console.log("   - The stored hash might be for a different password");
    console.log("   - Or the hash format might be incorrect");
    console.log("\n💡 Solution:");
    console.log("   1. Run: bun run scripts/fix-password-hash.ts 1234");
    console.log("   2. Restart your Next.js dev server");
    console.log("   3. Make sure you're using password '1234'");
  }
  
  console.log("\n" + "=".repeat(70));
}

main().catch(console.error);

