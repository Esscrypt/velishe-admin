import { pgTable, text, integer, timestamp, serial, unique, boolean, pgEnum, jsonb, primaryKey } from "drizzle-orm/pg-core";

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
  bioEn: text("bio_en"),
  bioBg: text("bio_bg"),
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
  modelId: integer("model_id").references(() => models.id, {
    onDelete: "set null",
  }),
  credits: jsonb("credits"),
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

/** Singleton CMS row id for typed site copy tables. */
export const SITE_CONTENT_SINGLETON_ID = "default";

/** Contact page visible copy overrides (EN + BG). Blank → public site defaults. */
export const contactPageContent = pgTable("contact_page_content", {
  id: text("id").primaryKey(),
  intro1En: text("intro1_en").notNull(),
  intro2En: text("intro2_en").notNull(),
  intro3En: text("intro3_en").notNull(),
  intro4En: text("intro4_en").notNull(),
  companyHeadingEn: text("company_heading_en").notNull(),
  officeAddressEn: text("office_address_en").notNull(),
  intro1Bg: text("intro1_bg").notNull(),
  intro2Bg: text("intro2_bg").notNull(),
  intro3Bg: text("intro3_bg").notNull(),
  intro4Bg: text("intro4_bg").notNull(),
  companyHeadingBg: text("company_heading_bg").notNull(),
  officeAddressBg: text("office_address_bg").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Dynamic homepage FAQ items (one row per Q&A per locale). */
export const homeFaqItems = pgTable(
  "home_faq_items",
  {
    id: text("id").notNull(),
    locale: text("locale").notNull(),
    sortOrder: integer("sort_order").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.locale, table.id] }),
  }),
);

export type ContactPageContentRow = typeof contactPageContent.$inferSelect;
export type ContactPageContentInsert = typeof contactPageContent.$inferInsert;
export type HomeFaqItemRow = typeof homeFaqItems.$inferSelect;
export type HomeFaqItemInsert = typeof homeFaqItems.$inferInsert;

