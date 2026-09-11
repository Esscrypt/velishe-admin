import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth-middleware";
import { getDb, schema } from "@/lib/db";
import {
  SITE_CONTENT_SINGLETON_ID,
  type ContactPageContentInsert,
} from "@/lib/db/schema";
import { triggerRevalidation } from "@/lib/revalidate";

export type ContactLocaleBody = {
  intro1: string;
  intro2: string;
  intro3: string;
  intro4: string;
  companyHeading: string;
  officeAddress: string;
};

export type ContactContentBody = {
  en: ContactLocaleBody;
  bg: ContactLocaleBody;
};

function emptyLocale(): ContactLocaleBody {
  return {
    intro1: "",
    intro2: "",
    intro3: "",
    intro4: "",
    companyHeading: "",
    officeAddress: "",
  };
}

function normalizeLocale(raw: unknown): ContactLocaleBody {
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const str = (key: keyof ContactLocaleBody) =>
    typeof o[key] === "string" ? (o[key] as string) : "";
  return {
    intro1: str("intro1"),
    intro2: str("intro2"),
    intro3: str("intro3"),
    intro4: str("intro4"),
    companyHeading: str("companyHeading"),
    officeAddress: str("officeAddress"),
  };
}

function normalizeContent(raw: unknown): ContactContentBody {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    en: normalizeLocale(root.en),
    bg: normalizeLocale(root.bg),
  };
}

function rowToContent(
  row: typeof schema.contactPageContent.$inferSelect | undefined,
): ContactContentBody {
  if (!row) {
    return { en: emptyLocale(), bg: emptyLocale() };
  }
  return {
    en: {
      intro1: row.intro1En ?? "",
      intro2: row.intro2En ?? "",
      intro3: row.intro3En ?? "",
      intro4: row.intro4En ?? "",
      companyHeading: row.companyHeadingEn ?? "",
      officeAddress: row.officeAddressEn ?? "",
    },
    bg: {
      intro1: row.intro1Bg ?? "",
      intro2: row.intro2Bg ?? "",
      intro3: row.intro3Bg ?? "",
      intro4: row.intro4Bg ?? "",
      companyHeading: row.companyHeadingBg ?? "",
      officeAddress: row.officeAddressBg ?? "",
    },
  };
}

function contentToInsert(content: ContactContentBody): ContactPageContentInsert {
  return {
    id: SITE_CONTENT_SINGLETON_ID,
    intro1En: content.en.intro1,
    intro2En: content.en.intro2,
    intro3En: content.en.intro3,
    intro4En: content.en.intro4,
    companyHeadingEn: content.en.companyHeading,
    officeAddressEn: content.en.officeAddress,
    intro1Bg: content.bg.intro1,
    intro2Bg: content.bg.intro2,
    intro3Bg: content.bg.intro3,
    intro4Bg: content.bg.intro4,
    companyHeadingBg: content.bg.companyHeading,
    officeAddressBg: content.bg.officeAddress,
    updatedAt: new Date(),
  };
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
      .from(schema.contactPageContent)
      .where(eq(schema.contactPageContent.id, SITE_CONTENT_SINGLETON_ID))
      .limit(1);

    return NextResponse.json({
      content: rowToContent(rows[0]),
      updatedAt: rows[0]?.updatedAt ?? null,
    });
  } catch (error) {
    console.error("[GET /api/site-content/contact]", error);
    return NextResponse.json({ error: "Failed to load contact content" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.authorized) return auth.response!;
    const body = auth.body as { content?: unknown };

    const content = normalizeContent(body.content);
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const values = contentToInsert(content);
    const { id: _id, ...setValues } = values;
    await db
      .insert(schema.contactPageContent)
      .values(values)
      .onConflictDoUpdate({
        target: schema.contactPageContent.id,
        set: setValues,
      });

    await triggerRevalidation({ type: "contact" });
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error("[PUT /api/site-content/contact]", error);
    return NextResponse.json({ error: "Failed to save contact content" }, { status: 500 });
  }
}
