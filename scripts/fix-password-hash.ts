import { hashPasswordForStorage } from "../lib/auth";
import { readFileSync, writeFileSync } from "node:fs";

async function main() {
  const password = process.argv[2] || "1234";
  
  console.log("=".repeat(60));
  console.log("Generate and Update Password Hash");
  console.log("=".repeat(60));
  
  console.log(`\n📝 Generating hash for password: "${password}"`);
  const hash = await hashPasswordForStorage(password);
  
  console.log(`\n Generated hash:`);
  console.log(hash);
  
  // Read .env.local
  let envContent: string;
  try {
    envContent = readFileSync(".env.local", "utf-8");
  } catch (error) {
    console.log("\n❌ .env.local file not found. Creating it...");
    envContent = "";
  }
  
  // Update or add ADMIN_PASSWORD_HASH (quoted to handle $ characters in bcrypt hash)
  const hashLine = `ADMIN_PASSWORD_HASH="${hash}"`;
  
  if (envContent.includes("ADMIN_PASSWORD_HASH=")) {
    // Replace existing line
    envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/g, hashLine);
    console.log("\n Updated existing ADMIN_PASSWORD_HASH in .env.local");
  } else {
    // Add new line
    envContent += (envContent.endsWith("\n") ? "" : "\n") + hashLine + "\n";
    console.log("\n Added ADMIN_PASSWORD_HASH to .env.local");
  }
  
  // Write back to file
  writeFileSync(".env.local", envContent);
  
  console.log("\n .env.local has been updated!");
  console.log("\n⚠️  IMPORTANT: Restart your dev server for changes to take effect!");
  console.log("\n" + "=".repeat(60));
}

main().catch(console.error);

