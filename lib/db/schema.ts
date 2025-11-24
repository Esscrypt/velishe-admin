import { pgTable, text, jsonb, integer, timestamp, serial } from "drizzle-orm/pg-core";

export interface ModelStats {
  height: string;
  bust: string;
  waist: string;
  hips: string;
  shoeSize: string;
  hairColor: string;
  eyeColor: string;
}

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  stats: jsonb("stats").$type<ModelStats>().notNull(),
  instagram: text("instagram"),
  featuredImage: text("featured_image"),
});

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  modelId: integer("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<"image" | "video">(),
  src: text("src").notNull(), // File path for reference, but data is in data field
  alt: text("alt").notNull(),
  data: text("data"), // Base64 encoded image data
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ModelRow = typeof models.$inferSelect;
export type ModelInsert = typeof models.$inferInsert;
export type ImageRow = typeof images.$inferSelect;
export type ImageInsert = typeof images.$inferInsert;

