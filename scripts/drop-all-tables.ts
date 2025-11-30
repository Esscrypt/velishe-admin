import postgres from "postgres";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:MokHSkphrnqzBWvAdTijMGAPllrKEQYj@maglev.proxy.rlwy.net:36829/railway";

const sql = postgres(DATABASE_URL);

async function dropAllTables() {
  try {
    // Get all table names in the public schema
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    console.log("Found tables:", tables.map(t => t.tablename));
    
    if (tables.length === 0) {
      console.log("No tables to drop.");
      return;
    }
    
    // Drop all tables with CASCADE to handle foreign keys
    for (const table of tables) {
      console.log(`Dropping table: ${table.tablename}`);
      await sql.unsafe(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
    }
    
    // Also drop the drizzle schema if it exists
    await sql.unsafe(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    
    console.log("All tables dropped successfully!");
  } catch (error) {
    console.error("Error dropping tables:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

dropAllTables();

