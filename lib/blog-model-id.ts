import { and, eq } from "drizzle-orm";
import type { getDb } from "@/lib/db";
import { schema } from "@/lib/db";

type Db = NonNullable<ReturnType<typeof getDb>>;

/** undefined = omit from update; null = clear; number = set if published model exists */
export async function resolveBlogModelId(
  db: Db,
  raw: unknown,
): Promise<number | null | undefined> {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (Number.isNaN(id)) return null;
  const rows = await db
    .select({ id: schema.models.id, slug: schema.models.slug })
    .from(schema.models)
    .where(and(eq(schema.models.id, id), eq(schema.models.published, true)))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function modelSlugForId(
  db: Db,
  modelId: number | null | undefined,
): Promise<string | null> {
  if (modelId == null) return null;
  const rows = await db
    .select({ slug: schema.models.slug })
    .from(schema.models)
    .where(eq(schema.models.id, modelId))
    .limit(1);
  const slug = rows[0]?.slug?.trim();
  return slug || null;
}
