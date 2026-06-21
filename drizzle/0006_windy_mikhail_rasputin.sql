CREATE TYPE "public"."board" AS ENUM('mainboard', 'development');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "board" "board" DEFAULT 'mainboard' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "gender" "gender" DEFAULT 'female' NOT NULL;
INSERT INTO "boards" ("id", "label", "enabled", "display_order") VALUES
  ('mainboard', 'Mainboard', true, 0),
  ('development', 'Development', true, 1)
ON CONFLICT ("id") DO NOTHING;