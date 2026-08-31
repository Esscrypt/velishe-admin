ALTER TABLE "blog_images" ADD COLUMN "kind" text DEFAULT 'image' NOT NULL;
ALTER TABLE "blog_images" ADD COLUMN "video_url" text;
ALTER TABLE "blog_images" ADD COLUMN "video_provider" text;
ALTER TABLE "blog_images" ALTER COLUMN "data" DROP NOT NULL;
