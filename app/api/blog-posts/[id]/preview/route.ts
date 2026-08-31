import { NextRequest, NextResponse } from "next/server";
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
import { createSmtpTransporter, isSmtpConfigured } from "@/lib/smtp";

export const maxDuration = 60;
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const body = (await request.json()) as {
      passwordHash?: string;
      email?: string;
    };
    const authResult = await verifyAuth(body);
    if (!authResult.authorized) return authResult.response!;

    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const postId = Number.parseInt(id, 10);
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const contextData = await loadPostNewsletterContext(postId);
    if (!contextData) {
      return NextResponse.json(
        { error: "Post not found or USER_FE_URL not configured" },
        { status: 404 },
      );
    }

    const privacyUrl = `${contextData.userFeUrl}/privacy/`;
    const { coverImageSrc, attachment } = await resolveNewsletterCoverImageSrc(
      postId,
      contextData.coverAbsoluteUrl,
      contextData.userFeUrl,
    );
    const payload = buildNewsletterPayload({
      ...buildNewsletterArgsFromPost(contextData, {
        unsubscribeUrl: privacyUrl,
        isPreview: true,
        coverImageSrc,
      }),
      subjectPrefix: "[Preview] ",
    });

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
    await transporter.sendMail({
      from: `"Velishe Model Management" <${from}>`,
      to: email,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      attachments: attachment ? [coverAttachmentForNodemailer(attachment)] : [],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/blog-posts/:id/preview]", error);
    return NextResponse.json(
      { error: "Failed to send preview" },
      { status: 500 },
    );
  }
}
