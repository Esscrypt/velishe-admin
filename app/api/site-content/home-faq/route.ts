import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/lib/auth-middleware";
import { getDb, schema } from "@/lib/db";
import {
  SITE_CONTENT_SINGLETON_ID,
  type HomeFaqContentInsert,
} from "@/lib/db/schema";
import { triggerRevalidation } from "@/lib/revalidate";

export type HomeFaqLocaleBody = {
  intro: string;
  whatWeDo: string;
  requirements: string;
  academy: string;
  booking: string;
  journal: string;
  vision: string;
  questionAbout: string;
  questionWhatWeDo: string;
  questionRequirements: string;
  questionAcademy: string;
  questionBooking: string;
  questionJournal: string;
};

export type HomeFaqContentBody = {
  en: HomeFaqLocaleBody;
  bg: HomeFaqLocaleBody;
};

const LOCALE_KEYS = [
  "intro",
  "whatWeDo",
  "requirements",
  "academy",
  "booking",
  "journal",
  "vision",
  "questionAbout",
  "questionWhatWeDo",
  "questionRequirements",
  "questionAcademy",
  "questionBooking",
  "questionJournal",
] as const satisfies ReadonlyArray<keyof HomeFaqLocaleBody>;

function emptyLocale(): HomeFaqLocaleBody {
  return {
    intro: "",
    whatWeDo: "",
    requirements: "",
    academy: "",
    booking: "",
    journal: "",
    vision: "",
    questionAbout: "",
    questionWhatWeDo: "",
    questionRequirements: "",
    questionAcademy: "",
    questionBooking: "",
    questionJournal: "",
  };
}

function normalizeLocale(raw: unknown): HomeFaqLocaleBody {
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out = emptyLocale();
  for (const key of LOCALE_KEYS) {
    out[key] = typeof o[key] === "string" ? (o[key] as string) : "";
  }
  return out;
}

function normalizeContent(raw: unknown): HomeFaqContentBody {
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
  row: typeof schema.homeFaqContent.$inferSelect | undefined,
): HomeFaqContentBody {
  if (!row) {
    return { en: emptyLocale(), bg: emptyLocale() };
  }
  return {
    en: {
      intro: row.introEn ?? "",
      whatWeDo: row.whatWeDoEn ?? "",
      requirements: row.requirementsEn ?? "",
      academy: row.academyEn ?? "",
      booking: row.bookingEn ?? "",
      journal: row.journalEn ?? "",
      vision: row.visionEn ?? "",
      questionAbout: row.questionAboutEn ?? "",
      questionWhatWeDo: row.questionWhatWeDoEn ?? "",
      questionRequirements: row.questionRequirementsEn ?? "",
      questionAcademy: row.questionAcademyEn ?? "",
      questionBooking: row.questionBookingEn ?? "",
      questionJournal: row.questionJournalEn ?? "",
    },
    bg: {
      intro: row.introBg ?? "",
      whatWeDo: row.whatWeDoBg ?? "",
      requirements: row.requirementsBg ?? "",
      academy: row.academyBg ?? "",
      booking: row.bookingBg ?? "",
      journal: row.journalBg ?? "",
      vision: row.visionBg ?? "",
      questionAbout: row.questionAboutBg ?? "",
      questionWhatWeDo: row.questionWhatWeDoBg ?? "",
      questionRequirements: row.questionRequirementsBg ?? "",
      questionAcademy: row.questionAcademyBg ?? "",
      questionBooking: row.questionBookingBg ?? "",
      questionJournal: row.questionJournalBg ?? "",
    },
  };
}

function contentToInsert(content: HomeFaqContentBody): HomeFaqContentInsert {
  return {
    id: SITE_CONTENT_SINGLETON_ID,
    introEn: content.en.intro,
    whatWeDoEn: content.en.whatWeDo,
    requirementsEn: content.en.requirements,
    academyEn: content.en.academy,
    bookingEn: content.en.booking,
    journalEn: content.en.journal,
    visionEn: content.en.vision,
    questionAboutEn: content.en.questionAbout,
    questionWhatWeDoEn: content.en.questionWhatWeDo,
    questionRequirementsEn: content.en.questionRequirements,
    questionAcademyEn: content.en.questionAcademy,
    questionBookingEn: content.en.questionBooking,
    questionJournalEn: content.en.questionJournal,
    introBg: content.bg.intro,
    whatWeDoBg: content.bg.whatWeDo,
    requirementsBg: content.bg.requirements,
    academyBg: content.bg.academy,
    bookingBg: content.bg.booking,
    journalBg: content.bg.journal,
    visionBg: content.bg.vision,
    questionAboutBg: content.bg.questionAbout,
    questionWhatWeDoBg: content.bg.questionWhatWeDo,
    questionRequirementsBg: content.bg.questionRequirements,
    questionAcademyBg: content.bg.questionAcademy,
    questionBookingBg: content.bg.questionBooking,
    questionJournalBg: content.bg.questionJournal,
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
      .from(schema.homeFaqContent)
      .where(eq(schema.homeFaqContent.id, SITE_CONTENT_SINGLETON_ID))
      .limit(1);

    return NextResponse.json({
      content: rowToContent(rows[0]),
      updatedAt: rows[0]?.updatedAt ?? null,
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

    const content = normalizeContent(body.content);
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const values = contentToInsert(content);
    const { id: _id, ...setValues } = values;
    await db
      .insert(schema.homeFaqContent)
      .values(values)
      .onConflictDoUpdate({
        target: schema.homeFaqContent.id,
        set: setValues,
      });

    await triggerRevalidation({ type: "home_faq" });
    return NextResponse.json({ ok: true, content });
  } catch (error) {
    console.error("[PUT /api/site-content/home-faq]", error);
    return NextResponse.json({ error: "Failed to save home FAQ content" }, { status: 500 });
  }
}
