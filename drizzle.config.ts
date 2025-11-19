import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local first (takes precedence), then .env
config({ path: ".env.local" });
config();

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
      }
    : undefined,
});



