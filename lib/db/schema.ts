import { pgTable, text, integer, timestamp, serial, unique, boolean } from "drizzle-orm/pg-core";

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
  slug: text("slug").unique(),
  name: text("name"),
  height: text("height"),
  bust: text("bust"),
  waist: text("waist"),
  hips: text("hips"),
  shoeSize: text("shoe_size"),
  hairColor: text("hair_color"),
  eyeColor: text("eye_color"),
  instagram: text("instagram"),
  displayOrder: integer("display_order").default(0),
});

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  modelId: integer("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("image"), // 'image' or 'digital'
  data: text("data").notNull(), // Base64 encoded image data
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  modelOrderUnique: unique().on(table.modelId, table.order),
}));

export const academyWishlistEntries = pgTable("academy_wishlist_entries", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number").notNull(),
  emailSent: boolean("email_sent").notNull().default(false),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ModelRow = typeof models.$inferSelect;
export type ModelInsert = typeof models.$inferInsert;
export type ImageRow = typeof images.$inferSelect;
export type ImageInsert = typeof images.$inferInsert;
export type AcademyWishlistEntryRow = typeof academyWishlistEntries.$inferSelect;
export type AcademyWishlistEntryInsert = typeof academyWishlistEntries.$inferInsert;

