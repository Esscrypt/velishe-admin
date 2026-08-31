import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { verifyAuth } from "@/lib/auth-middleware";
import {
  buildNewsletterArgsFromPost,
  loadPostNewsletterContext,
} from "@/lib/newsletter-context";
import { buildNewsletterPayload } from "@/lib/newsletter-payload";
import {
  coverAttachmentForNodemailer,
  resolveNewsletterCoverImageSrc,
} from "@/lib/newsletter-cover";
import { assertCanSendNewsletter } from "@/lib/newsletter-send";
import { createSmtpTransporter, isSmtpConfigured } from "@/lib/smtp";
import { newsletterContextErrorMessage } from "@/lib/user-fe-url";
import { config } from "dotenv";

config();

export const maxDuration = 60;
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json()) as {
      passwordHash?: string;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const { id } = await context.params;
    const postId = Number.parseInt(id, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 },
      );
    }

    const posts = await db
      .select()
      .from(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .limit(1);
    if (posts.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const post = posts[0];

    const recipients = await db
      .select({
        email: schema.mailingListSubscribers.email,
        unsubscribeToken: schema.mailingListSubscribers.unsubscribeToken,
      })
      .from(schema.mailingListSubscribers)
      .where(
        and(
          eq(schema.mailingListSubscribers.confirmed, true),
          isNull(schema.mailingListSubscribers.unsubscribedAt),
        ),
      );

    const guard = assertCanSendNewsletter(
      {
        published: post.published,
        newsletterSentAt: post.newsletterSentAt,
      },
      recipients.length,
    );
    if (guard.ok === false) {
      return NextResponse.json(
        { error: guard.error },
        { status: guard.status },
      );
    }

    const contextResult = await loadPostNewsletterContext(postId);
    if (contextResult.ok === false) {
      return NextResponse.json(
        { error: newsletterContextErrorMessage(contextResult.reason) },
        { status: contextResult.reason === "post_not_found" ? 404 : 503 },
      );
    }
    const contextData = contextResult.data;

    if (!isSmtpConfigured()) {
      return NextResponse.json(
        {
          error:
            "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in the admin environment.",
        },
        { status: 503 },
      );
    }

    const { transporter, from } = createSmtpTransporter();
    const { coverImageSrc, attachment } = await resolveNewsletterCoverImageSrc(
      postId,
      contextData.coverAbsoluteUrl,
      contextData.userFeUrl,
    );
    const mailAttachments = attachment
      ? [coverAttachmentForNodemailer(attachment)]
      : [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const unsubscribeUrl = `${contextData.userFeUrl}/blog/unsubscribe/${recipient.unsubscribeToken}/`;
      const payload = buildNewsletterPayload(
        buildNewsletterArgsFromPost(contextData, {
          unsubscribeUrl,
          coverImageSrc,
        }),
      );
      try {
        await transporter.sendMail({
          from: `"Velishe Model Management" <${from}>`,
          to: recipient.email,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          attachments: mailAttachments,
        });
        sent += 1;
      } catch (error) {
        console.error("[newsletter] send failed", recipient.email, error);
        failed += 1;
      }
    }

    await db
      .update(schema.blogPosts)
      .set({
        newsletterSentAt: new Date(),
        updatedAt: new Date(),
      } as Partial<typeof schema.blogPosts.$inferInsert>)
      .where(eq(schema.blogPosts.id, postId));

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("[POST /api/blog-posts/:id/send]", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 },
    );
  }
}
