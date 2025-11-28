import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqlInstance: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  if (!sqlInstance) {
    sqlInstance = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  if (!dbInstance) {
    dbInstance = drizzle(sqlInstance, { schema });
  }

  return dbInstance;
}

export { schema };
export * from "drizzle-orm";
export type { ModelInsert, ModelRow, ImageInsert, ImageRow } from "./schema";

