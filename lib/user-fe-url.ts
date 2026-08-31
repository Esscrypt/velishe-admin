const PRODUCTION_SITE_URL = "https://www.velishemodelmanagement.com";

export function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export function isAllowedUserFeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") {
      return true;
    }

    return (
      host.endsWith("velishemodelmanagement.com") ||
      host.endsWith(".vercel.app") ||
      host === "velishe.vercel.app"
    );
  } catch {
    return false;
  }
}

export function getUserFeUrl(override?: string | null): string | null {
  const candidates = [
    override,
    process.env.USER_FE_URL,
    process.env.NEXT_PUBLIC_USER_FE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const normalized = normalizeSiteUrl(raw);
    if (isAllowedUserFeUrl(normalized)) {
      return normalized;
    }
  }

  return null;
}

export function getUserFeUrlOrProductionFallback(
  override?: string | null,
): string {
  return getUserFeUrl(override) ?? PRODUCTION_SITE_URL;
}

export type NewsletterContextFailureReason =
  | "database"
  | "post_not_found"
  | "user_fe_url";

export function newsletterContextErrorMessage(
  reason: NewsletterContextFailureReason,
): string {
  switch (reason) {
    case "database":
      return "Database connection not available";
    case "post_not_found":
      return "Post not found";
    case "user_fe_url":
      return "Public site URL is not configured. Set USER_FE_URL on the server or NEXT_PUBLIC_USER_FE_URL / Public site URL in the admin UI.";
  }
}
