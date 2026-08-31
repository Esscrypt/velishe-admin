import { config } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb, schema } from "@/lib/db";

config({ path: ".env.local" });
config();

function newToken(): string {
  return randomBytes(32).toString("hex");
}

type SyncPlan = "insert_confirmed" | "promote_pending" | "noop" | "skip_unsubscribed";

function planSync(row: {
  confirmed: boolean;
  unsubscribedAt: Date | null;
} | null): SyncPlan {
  if (!row) return "insert_confirmed";
  if (row.unsubscribedAt) return "skip_unsubscribed";
  if (row.confirmed) return "noop";
  return "promote_pending";
}

async function main() {
  const allowProd = process.argv.includes("--allow-prod");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const host = new URL(url).hostname;
  if (host.includes("tramway") && !allowProd) {
    console.error(
      "Refusing prod host without --allow-prod. Use test DB or pass --allow-prod.",
    );
    process.exit(1);
  }

  const db = getDb();
  if (!db) throw new Error("Database connection not available");

  const emails = await db
    .selectDistinct({ email: schema.academyWishlistEntries.email })
    .from(schema.academyWishlistEntries);

  const counts = {
    inserted: 0,
    promoted: 0,
    noop: 0,
    skipped_unsubscribed: 0,
  };

  for (const { email: rawEmail } of emails) {
    const normalized = rawEmail.trim().toLowerCase();
    const existing = await db
      .select()
      .from(schema.mailingListSubscribers)
      .where(eq(schema.mailingListSubscribers.email, normalized))
      .limit(1);

    const row = existing[0] ?? null;
    const plan = planSync(
      row
        ? { confirmed: row.confirmed, unsubscribedAt: row.unsubscribedAt }
        : null,
    );

    if (plan === "skip_unsubscribed") {
      counts.skipped_unsubscribed += 1;
      continue;
    }
    if (plan === "noop") {
      counts.noop += 1;
      continue;
    }

    const now = new Date();

    if (plan === "insert_confirmed") {
      await db.insert(schema.mailingListSubscribers).values({
        email: normalized,
        confirmed: true,
        confirmedAt: now,
        confirmToken: newToken(),
        unsubscribeToken: newToken(),
      } as typeof schema.mailingListSubscribers.$inferInsert);
      counts.inserted += 1;
      continue;
    }

    if (row) {
      await db
        .update(schema.mailingListSubscribers)
        .set({ confirmed: true, confirmedAt: now } as Partial<
          typeof schema.mailingListSubscribers.$inferInsert
        >)
        .where(eq(schema.mailingListSubscribers.id, row.id));
      counts.promoted += 1;
    }
  }

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.mailingListSubscribers);

  console.log(JSON.stringify({ host, ...counts, totalSubscribers: total[0]?.count ?? 0 }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
