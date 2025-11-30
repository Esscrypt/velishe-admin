import postgres from "postgres";
import { config } from "dotenv";

config();

const sql = postgres(process.env.DATABASE_URL!);

async function checkMigrations() {
  try {
    // Check what migrations are recorded
    const migrations = await sql`
      SELECT * FROM drizzle.__drizzle_migrations ORDER BY id
    `;
    
    console.log("Recorded migrations:", migrations);
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('models', 'images')
    `;
    
    console.log("Existing tables:", tables);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sql.end();
  }
}

checkMigrations();

