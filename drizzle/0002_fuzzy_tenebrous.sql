CREATE TABLE "academy_wishlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone_number" text NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
