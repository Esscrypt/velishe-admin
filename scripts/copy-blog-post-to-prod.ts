import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

const SLUG = "eli-bineva-tuborg-campaign";

const TEST_URL = process.env.TEST_DATABASE_URL;
const PROD_URL = process.env.DATABASE_URL;

async function main() {
  if (!TEST_URL) throw new Error("TEST_DATABASE_URL is not set");
  if (!PROD_URL) throw new Error("DATABASE_URL is not set");

  const allowProd = process.argv.includes("--allow-prod");
  const prodHost = new URL(PROD_URL).hostname;
  if (prodHost.includes("tramway") && !allowProd) {
    console.error("Refusing prod host without --allow-prod");
    process.exit(1);
  }

  const testSql = postgres(TEST_URL, { max: 1, connect_timeout: 15 });
  const prodSql = postgres(PROD_URL, {
    max: 1,
    connect_timeout: 15,
    ssl: { rejectUnauthorized: false },
  });

  const testDb = drizzle(testSql, { schema });
  const prodDb = drizzle(prodSql, { schema });

  try {
    const [post] = await testDb
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.slug, SLUG))
      .limit(1);

    if (!post) {
      throw new Error(`Post "${SLUG}" not found on test DB`);
    }

    const images = await testDb
      .select()
      .from(schema.blogImages)
      .where(eq(schema.blogImages.postId, post.id))
      .orderBy(schema.blogImages.order);

    const existing = await prodDb
      .select({ id: schema.blogPosts.id })
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.slug, SLUG))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        JSON.stringify({
          status: "already_exists",
          slug: SLUG,
          prodPostId: existing[0].id,
        }),
      );
      return;
    }

    const [inserted] = await prodDb
      .insert(schema.blogPosts)
      .values({
        slug: post.slug,
        title: post.title,
        teaser: post.teaser,
        body: post.body,
        published: post.published,
        publishedAt: post.publishedAt,
        newsletterSentAt: post.newsletterSentAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      } as typeof schema.blogPosts.$inferInsert)
      .returning({ id: schema.blogPosts.id });

    for (const image of images) {
      await prodDb.insert(schema.blogImages).values({
        id: image.id,
        postId: inserted.id,
        data: image.data,
        alt: image.alt,
        order: image.order,
        createdAt: image.createdAt,
      } as typeof schema.blogImages.$inferInsert);
    }

    console.log(
      JSON.stringify({
        status: "inserted",
        slug: SLUG,
        prodPostId: inserted.id,
        imageCount: images.length,
        prodHost,
      }),
    );
  } finally {
    await testSql.end();
    await prodSql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
