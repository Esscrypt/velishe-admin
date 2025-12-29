ALTER TABLE "images" ALTER COLUMN "order" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "type" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_model_id_order_unique" UNIQUE("model_id","order");