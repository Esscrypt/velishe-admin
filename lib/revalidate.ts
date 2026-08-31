import { PRODUCTION_SITE_URL } from "@/lib/user-fe-url";

export type RevalidateOptions = {
  slug?: string;
  type?: "blog" | "models";
};

export async function triggerRevalidation(
  slugOrOptions?: string | RevalidateOptions,
): Promise<void> {
  const options: RevalidateOptions =
    typeof slugOrOptions === "string"
      ? { slug: slugOrOptions, type: "models" }
      : slugOrOptions ?? { type: "models" };

  const secret = process.env.REVALIDATION_SECRET;
  const userFEUrl = PRODUCTION_SITE_URL;
  if (!secret) {
    console.error("[revalidate] Skipping: missing REVALIDATION_SECRET in env");
    return;
  }

  try {
    const response = await fetch(`${userFEUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        slug: options.slug,
        type: options.type ?? "models",
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[revalidate] User FE returned ${response.status}: ${body.slice(0, 200)}`,
      );
    }
  } catch (error) {
    console.error("[revalidate] Failed to ping user FE:", error);
  }
}
