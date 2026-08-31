export type NewsletterPostGuard = {
  published: boolean;
  newsletterSentAt: Date | null;
};

export type SendGuardResult =
  | { ok: true }
  | { ok: false; status: 400 | 409; error: string };

export function assertCanSendNewsletter(
  post: NewsletterPostGuard,
  recipientCount: number,
): SendGuardResult {
  if (!post.published) {
    return { ok: false, status: 400, error: "Post is not published" };
  }
  if (post.newsletterSentAt) {
    return { ok: false, status: 409, error: "Newsletter already sent" };
  }
  if (recipientCount === 0) {
    return { ok: false, status: 400, error: "No confirmed subscribers" };
  }
  return { ok: true };
}
