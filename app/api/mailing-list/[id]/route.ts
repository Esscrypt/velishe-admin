import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json()) as {
      passwordHash?: string;
      subscribed?: boolean;
      suppress?: boolean;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const subscribed =
      typeof body.subscribed === "boolean"
        ? body.subscribed
        : body.suppress === true
          ? false
          : undefined;

    if (subscribed === undefined) {
      return NextResponse.json(
        { error: "subscribed (boolean) is required" },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const subscriberId = Number.parseInt(id, 10);
    if (Number.isNaN(subscriberId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const now = new Date();
    const updated = await db
      .update(schema.mailingListSubscribers)
      .set(
        subscribed
          ? ({
              confirmed: true,
              confirmedAt: now,
              unsubscribedAt: null,
            } as Record<string, unknown>)
          : ({ unsubscribedAt: now } as Record<string, unknown>),
      )
      .where(eq(schema.mailingListSubscribers.id, subscriberId))
      .returning({
        id: schema.mailingListSubscribers.id,
        confirmed: schema.mailingListSubscribers.confirmed,
        unsubscribedAt: schema.mailingListSubscribers.unsubscribedAt,
      });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, subscriber: updated[0] });
  } catch (error) {
    console.error("[PATCH /api/mailing-list/:id]", error);
    return NextResponse.json(
      { error: "Failed to update subscriber" },
      { status: 500 },
    );
  }
}
