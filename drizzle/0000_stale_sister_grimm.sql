CREATE TABLE "images" (
	"id" text PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"data" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text,
	"name" text,
	"height" text,
	"bust" text,
	"waist" text,
	"hips" text,
	"shoe_size" text,
	"hair_color" text,
	"eye_color" text,
	"instagram" text,
	"display_order" integer DEFAULT 0,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;