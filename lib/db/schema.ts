import { pgTable, text, integer, timestamp, serial, unique, boolean, pgEnum } from "drizzle-orm/pg-core";

export const boardEnum = pgEnum("board", ["mainboard", "development"]);
export const genderEnum = pgEnum("gender", ["male", "female"]);

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
  booked: boolean("booked").default(false),
  targetLocation: text("target_location"),
  published: boolean("published").notNull().default(false),
  board: boardEnum("board").notNull().default("mainboard"),
  gender: genderEnum("gender").notNull().default("female"),
});

export const images = pgTable("images", {
  id: text("id").primaryKey(),
  modelId: integer("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("image"), // 'image' or 'digital'
  data: text("data").notNull(), // Base64 encoded image data
  order: integer("order").notNull(),
  phash: text("phash"), // dHash perceptual fingerprint for duplicate detection
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

export const boards = pgTable("boards", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  teaser: text("teaser"),
  body: text("body").notNull(),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  scheduledPublishAt: timestamp("scheduled_publish_at"),
  newsletterSentAt: timestamp("newsletter_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const blogImages = pgTable("blog_images", {
  id: text("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => blogPosts.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("image"), // 'image' | 'video'
  data: text("data"), // WebP data URI for images / optional video poster
  videoUrl: text("video_url"),
  videoProvider: text("video_provider"), // youtube | vimeo | instagram
  alt: text("alt").notNull().default(""),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  postOrderUnique: unique().on(table.postId, table.order),
}));

export const mailingListSubscribers = pgTable("mailing_list_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  confirmed: boolean("confirmed").notNull().default(false),
  confirmToken: text("confirm_token").notNull().unique(),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  confirmedAt: timestamp("confirmed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BlogPostRow = typeof blogPosts.$inferSelect;
export type BlogPostInsert = typeof blogPosts.$inferInsert;
export type BlogImageRow = typeof blogImages.$inferSelect;
export type BlogImageInsert = typeof blogImages.$inferInsert;
export type MailingListSubscriberRow = typeof mailingListSubscribers.$inferSelect;
export type MailingListSubscriberInsert = typeof mailingListSubscribers.$inferInsert;

