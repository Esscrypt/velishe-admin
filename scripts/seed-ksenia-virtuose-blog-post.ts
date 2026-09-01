import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { config } from "dotenv";
import { getDb, schema } from "../lib/db";
import {
  newBlockId,
  serializeBlocksDocument,
  type BlogBlock,
} from "../lib/blog-blocks";
import { parseBlogVideoUrl } from "../lib/blog-video-url";
import { triggerRevalidation } from "../lib/revalidate";

config();

const SLUG = "ksenia-virtuose-hong-kong-tigerstrolling";
const INSTAGRAM_URL = "https://www.instagram.com/p/DcwF19wN6Z3/";
const MODEL_SLUG = "ksenia";

const TITLE = "Ksenia walks Tigerstrolling at VIRTUOSE 2026 in Hong Kong";
const TEASER =
  "Ksenia Lev opens the runway for Tigerstrolling during VIRTUOSE 2026 in Hong Kong — editorial coverage in Vogue Hong Kong and Harper's Bazaar HK.";

const CREDITS = {
  brand: { name: "Tigerstrolling", url: "https://www.instagram.com/tigerstrolling/" },
  photographer: null,
  magazine: { name: "Vogue Hong Kong", url: "https://www.instagram.com/voguehongkong/" },
  extras: [
    {
      role: "Magazine",
      name: "Harper's Bazaar HK",
      url: "https://www.instagram.com/harpersbazaarhk/",
    },
    {
      role: "Event",
      name: "VIRTUOSE 2026",
      url: "https://www.instagram.com/virtuose.hk/",
    },
  ],
  sourceUrl: INSTAGRAM_URL,
};

export function buildKseniaBlocks(coverMediaId: string): BlogBlock[] {
  return [
    {
      id: newBlockId(),
      type: "paragraph",
      text: "Runway proof travels fast when the credit line is clear.",
    },
    {
      id: newBlockId(),
      type: "paragraph",
      text: "**Ksenia Lev** walked for **Tigerstrolling** during **VIRTUOSE 2026** in **Hong Kong** — a show moment that landed in **Vogue Hong Kong** and **Harper's Bazaar HK**. For Velishe Model Management, it is exactly the kind of international placement that compounds: designer credit, city credit, press credit, and a model who can hold a runway frame under show lights.",
    },
    {
      id: newBlockId(),
      type: "media",
      mediaId: coverMediaId,
      layout: "full",
    },
    {
      id: newBlockId(),
      type: "paragraph",
      text: "VIRTUOSE sits inside Hong Kong's fashion-week energy — HKFDA, Fashion Design HK, West K, Hong Kong Palace Museum — and Tigerstrolling's line reads sharp on the move. Ksenia's walk does the rest: pace, posture, and a face that editorial teams can place on a cover or in a campaign deck without explanation.",
    },
    {
      id: newBlockId(),
      type: "paragraph",
      text: "International runway is still how boutique agencies signal range. One strong Hong Kong week becomes the next casting brief.",
    },
  ];
}

async function main() {
  const allowProd = process.argv.includes("--allow-prod");
  const shouldUpdate = process.argv.includes("--update");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const prodHost = new URL(databaseUrl).hostname;
  if (prodHost.includes("tramway") && !allowProd) {
    console.error("Refusing prod host without --allow-prod");
    process.exit(1);
  }

  const db = getDb();
  if (!db) throw new Error("Database connection not available");

  const existing = await db
    .select({ id: schema.blogPosts.id })
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.slug, SLUG))
    .limit(1);

  if (existing.length > 0 && !shouldUpdate) {
    console.log(JSON.stringify({ status: "already_exists", slug: SLUG, id: existing[0].id }));
    return;
  }

  const [model] = await db
    .select({ id: schema.models.id })
    .from(schema.models)
    .where(eq(schema.models.slug, MODEL_SLUG))
    .limit(1);
  if (!model) throw new Error(`Model "${MODEL_SLUG}" not found`);

  const parsed = parseBlogVideoUrl(INSTAGRAM_URL);
  if (!parsed) throw new Error("Invalid Instagram URL");

  const now = new Date();

  if (existing.length > 0 && shouldUpdate) {
    const postId = existing[0].id;
    const coverRows = await db
      .select({ id: schema.blogImages.id })
      .from(schema.blogImages)
      .where(eq(schema.blogImages.postId, postId))
      .orderBy(asc(schema.blogImages.order))
      .limit(1);

    let coverId = coverRows[0]?.id;
    if (!coverId) {
      coverId = randomUUID();
      await db.insert(schema.blogImages).values({
        id: coverId,
        postId,
        kind: "video",
        data: null,
        videoUrl: parsed.canonicalUrl,
        videoProvider: parsed.provider,
        alt: `${TITLE} — Velishe Journal`,
        order: 0,
      } as typeof schema.blogImages.$inferInsert);
    }

    const body = serializeBlocksDocument(buildKseniaBlocks(coverId));
    await db
      .update(schema.blogPosts)
      .set({
        title: TITLE,
        teaser: TEASER,
        body,
        modelId: model.id,
        credits: CREDITS,
        updatedAt: now,
      } as Partial<typeof schema.blogPosts.$inferInsert>)
      .where(eq(schema.blogPosts.id, postId));

    await triggerRevalidation({ slug: SLUG, type: "blog" });

    console.log(
      JSON.stringify({
        status: "updated",
        slug: SLUG,
        postId,
        coverMediaId: coverId,
        url: `https://www.velishemodelmanagement.com/blog/${SLUG}/`,
      }),
    );
    return;
  }

  const coverId = randomUUID();
  const [post] = await db
    .insert(schema.blogPosts)
    .values({
      slug: SLUG,
      title: TITLE,
      teaser: TEASER,
      body: serializeBlocksDocument(buildKseniaBlocks(coverId)),
      published: true,
      publishedAt: now,
      modelId: model.id,
      credits: CREDITS,
      createdAt: now,
      updatedAt: now,
    } as typeof schema.blogPosts.$inferInsert)
    .returning({ id: schema.blogPosts.id });

  await db.insert(schema.blogImages).values({
    id: coverId,
    postId: post.id,
    kind: "video",
    data: null,
    videoUrl: parsed.canonicalUrl,
    videoProvider: parsed.provider,
    alt: `${TITLE} — Velishe Journal`,
    order: 0,
  } as typeof schema.blogImages.$inferInsert);

  await triggerRevalidation({ slug: SLUG, type: "blog" });

  console.log(
    JSON.stringify({
      status: "created",
      slug: SLUG,
      postId: post.id,
      modelId: model.id,
      coverMediaId: coverId,
      url: `https://www.velishemodelmanagement.com/blog/${SLUG}/`,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
