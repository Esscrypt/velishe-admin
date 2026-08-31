ALTER TABLE "blog_posts"
  ADD COLUMN IF NOT EXISTS "model_id" integer
  REFERENCES "models"("id") ON DELETE SET NULL;
