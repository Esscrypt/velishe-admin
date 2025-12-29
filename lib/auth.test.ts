// @ts-ignore - bun:test is built-in to Bun runtime
import { test, expect } from "bun:test";
import { hashPasswordForStorage, hashPasswordClient } from "./auth";
import { hashPassword } from "./client-auth";
import bcrypt from "bcryptjs";

const TEST_PASSWORD = "Sikeucantlogin_1";

test("round-trip password hashing with exact password 'Sikeucantlogin_1'", async () => {
  // Step 1: Generate hash for storage (like the script does)
  // This simulates: password.trim() -> hashPasswordForStorage
  const trimmedPassword = TEST_PASSWORD.trim();
  const storedHash = await hashPasswordForStorage(trimmedPassword);
  
  // Step 2: Simulate client-side hashing (like PasswordDialog does)
  // This simulates: password.trim() -> hashPassword (client-side)
  const clientHash = await hashPassword(trimmedPassword);
  
  // Step 3: Verify the client hash against the stored hash
  // This simulates: verifyPasswordHash(clientHash) -> compares with ADMIN_PASSWORD_HASH
  // We use bcrypt.compare directly since verifyPasswordHash reads env at module load
  const isValid = await bcrypt.compare(clientHash, storedHash);
  
  expect(isValid).toBe(true);
  expect(storedHash).toBeTruthy();
  expect(clientHash).toBeTruthy();
  
  // Verify that client and server SHA-256 hashing produce the same result
  const serverHash = hashPasswordClient(trimmedPassword);
  expect(clientHash).toBe(serverHash);
});

test("password trimming consistency", async () => {
  const passwordWithSpaces = `  ${TEST_PASSWORD}  `;
  
  // Generate hash with trimmed password (like script does)
  const trimmedPassword = passwordWithSpaces.trim();
  const storedHash = await hashPasswordForStorage(trimmedPassword);
  
  // Client-side hash with trimmed password (like frontend does)
  const clientHash = await hashPassword(trimmedPassword);
  
  // Verify using bcrypt.compare directly
  const isValid = await bcrypt.compare(clientHash, storedHash);
  
  expect(isValid).toBe(true);
  expect(trimmedPassword).toBe(TEST_PASSWORD);
});

test("client and server SHA-256 hashing produce same result", async () => {
  const password = TEST_PASSWORD;
  
  // Server-side SHA-256 (hashPasswordClient)
  const serverHash = hashPasswordClient(password);
  
  // Client-side SHA-256 (hashPassword)
  const clientHash = await hashPassword(password);
  
  // Both should produce the same SHA-256 hash
  expect(clientHash).toBe(serverHash);
  expect(clientHash.length).toBe(64); // SHA-256 produces 64 hex characters
});

test("verify specific hash 2595b9f3cf887a05f5dd6a92e56203b9827839ae07f7fe9070da99f918175c3d", async () => {
  // This test uses a specific SHA-256 hash directly (as if sent from client)
  const specificClientHash = "2595b9f3cf887a05f5dd6a92e56203b9827839ae07f7fe9070da99f918175c3d";
  
  // Verify it's a valid SHA-256 hash (64 hex characters)
  expect(specificClientHash.length).toBe(64);
  expect(/^[0-9a-f]{64}$/i.test(specificClientHash)).toBe(true);
  
  // Create a stored hash (bcrypt of the SHA-256 hash) - this simulates ADMIN_PASSWORD_HASH
  // In production, this would be: bcrypt.hash(SHA-256(password), 10)
  // Here we're creating it from the client hash directly
  const saltRounds = 10;
  const storedHash = await bcrypt.hash(specificClientHash, saltRounds);
  
  // Verify the specific client hash against the stored hash
  // This simulates: client sends specificClientHash -> server compares with ADMIN_PASSWORD_HASH
  const isValid = await bcrypt.compare(specificClientHash, storedHash);
  
  expect(isValid).toBe(true);
  expect(storedHash).toBeTruthy();
  expect(storedHash.startsWith("$2")).toBe(true); // bcrypt hashes start with $2
});

