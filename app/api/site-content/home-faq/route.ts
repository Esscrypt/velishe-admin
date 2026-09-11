import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth-middleware";
import { getDb, schema } from "@/lib/db";
import type { HomeFaqItemInsert } from "@/lib/db/schema";
import { triggerRevalidation } from "@/lib/revalidate";

export type HomeFaqItemBody = {
  id: string;
  question: string;
  answer: string;
};

export type HomeFaqContentBody = {
  en: HomeFaqItemBody[];
  bg: HomeFaqItemBody[];
};

function normalizeItem(raw: unknown): HomeFaqItemBody | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const question = typeof o.question === "string" ? o.question : "";
  const answer = typeof o.answer === "string" ? o.answer : "";
  if (!id) return null;
  return { id, question, answer };
}

function normalizeItems(raw: unknown): HomeFaqItemBody[] {
  if (!Array.isArray(raw)) return [];
  const out: HomeFaqItemBody[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const item = normalizeItem(entry);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function normalizeContent(raw: unknown): HomeFaqContentBody {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    en: normalizeItems(root.en),
    bg: normalizeItems(root.bg),
  };
}

function rowsToContent(
  rows: Array<typeof schema.homeFaqItems.$inferSelect>,
): HomeFaqContentBody {
  const en: HomeFaqItemBody[] = [];
  const bg: HomeFaqItemBody[] = [];
  for (const row of rows) {
    const item = {
      id: row.id,
      question: row.question ?? "",
      answer: row.answer ?? "",
    };
    if (row.locale === "bg") bg.push(item);
    else if (row.locale === "en") en.push(item);
  }
  return { en, bg };
}

export async function GET(request: NextRequest) {
  try {
    const passwordHash = new URL(request.url).searchParams.get("passwordHash");
    const auth = await verifyAuth({ passwordHash: passwordHash ?? undefined });
    if (!auth.authorized) return auth.response!;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const rows = await db
      .select()
      .from(schema.homeFaqItems)
      .orderBy(asc(schema.homeFaqItems.locale), asc(schema.homeFaqItems.sortOrder));

    const content = rowsToContent(rows);
    const latest = rows.reduce<Date | null>((acc, row) => {
      if (!row.updatedAt) return acc;
      if (!acc || row.updatedAt > acc) return row.updatedAt;
      return acc;
    }, null);

    return NextResponse.json({
      content,
      updatedAt: latest,
    });
  } catch (error) {
    console.error("[GET /api/site-content/home-faq]", error);
    return NextResponse.json({ error: "Failed to load home FAQ content" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authorized) return auth.response!;
    const body = auth.body as { content?: unknown };
    if (body.content === undefined) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 },
      );
    }

    const content = normalizeContent(body.content);
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const updatedAt = new Date();

    await db.transaction(async (tx) => {
      // Clear all rows first so cross-locale ID remints cannot collide mid-replace.
      await tx.delete(schema.homeFaqItems);

      for (const locale of ["en", "bg"] as const) {
        const items = content[locale];
        if (items.length === 0) continue;

        const values: HomeFaqItemInsert[] = items.map((item, index) => ({
          id: item.id,
          locale,
          sortOrder: index,
          question: item.question,
          answer: item.answer,
          updatedAt,
        }));
        await tx.insert(schema.homeFaqItems).values(values);
      }
    });

    await triggerRevalidation({ type: "home_faq" });
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error("[PUT /api/site-content/home-faq]", error);
    return NextResponse.json({ error: "Failed to save home FAQ content" }, { status: 500 });
  }
}
