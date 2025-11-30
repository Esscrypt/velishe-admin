CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"type" text NOT NULL,
	"src" text NOT NULL,
	"alt" text NOT NULL,
	"data" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text,
	"stats" jsonb,
	"instagram" text,
	"featured_image" text,
	"display_order" integer DEFAULT 0,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;