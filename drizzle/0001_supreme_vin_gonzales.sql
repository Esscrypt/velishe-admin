ALTER TABLE "images" ALTER COLUMN "order" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
-- Constraint already exists from main portfolio project migration, skip if exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'images_model_id_order_unique'
    ) THEN
        ALTER TABLE "images" ADD CONSTRAINT "images_model_id_order_unique" UNIQUE("model_id","order");
    END IF;
END $$;