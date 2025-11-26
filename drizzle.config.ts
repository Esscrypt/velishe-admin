
import { defineConfig } from "drizzle-kit";

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
