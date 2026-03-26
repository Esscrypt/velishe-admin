export async function triggerRevalidation(slug?: string): Promise<void> {
  const secret = process.env.REVALIDATION_SECRET;
  const userFEUrl = process.env.USER_FE_URL;
  if (!secret || !userFEUrl) return;

  try {
    await fetch(`${userFEUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, slug }),
    });
  } catch (error) {
    console.error("[revalidate] Failed to ping user FE:", error);
  }
}
