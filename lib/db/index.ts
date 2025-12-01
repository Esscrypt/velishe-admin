import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqlInstance: ReturnType<typeof postgres> | null = null;

/**
 * Get database connection instance
 * Returns null if DATABASE_URL is not configured
 */
export function getDb() {
  if (!process.env.DATABASE_URL) {
    console.warn("[getDb] DATABASE_URL environment variable is not set");
    return null;
  }

  if (!sqlInstance) {
    try {
      const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL;
      
      sqlInstance = postgres(process.env.DATABASE_URL, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        ssl: isProduction ? { rejectUnauthorized: false } : undefined,
      });
      console.log("[getDb] Database connection instance created");
    } catch (error) {
      console.error("[getDb] Failed to create database connection:", error);
      return null;
    }
  }

  if (!dbInstance) {
    dbInstance = drizzle(sqlInstance, { schema });
  }

  return dbInstance;
}

export { schema };
export * from "drizzle-orm";
export type { ModelInsert, ModelRow, ImageInsert, ImageRow } from "./schema";

