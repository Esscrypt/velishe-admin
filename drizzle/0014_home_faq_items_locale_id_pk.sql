ALTER TABLE "home_faq_items" DROP CONSTRAINT IF EXISTS "home_faq_items_pkey";
--> statement-breakpoint
ALTER TABLE "home_faq_items" ADD PRIMARY KEY ("locale","id");
