ALTER TABLE "blog_posts"
  ADD COLUMN IF NOT EXISTS "credits" jsonb;
