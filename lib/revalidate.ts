export async function triggerRevalidation(slug?: string): Promise<void> {
  const secret = process.env.REVALIDATION_SECRET;
  const userFEUrl = process.env.USER_FE_URL;
  if (!secret || !userFEUrl) {
    console.error(
      "[revalidate] Skipping: missing USER_FE_URL or REVALIDATION_SECRET in env",
    );
    return;
  }

  try {
    const response = await fetch(`${userFEUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, slug }),
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
