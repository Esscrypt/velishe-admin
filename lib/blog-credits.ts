export type BlogCreditLink = {
  name: string;
  url: string | null;
};

export type BlogCreditExtra = {
  role: string;
  name: string;
  url: string | null;
};

export type BlogCredits = {
  brand: BlogCreditLink | null;
  photographer: BlogCreditLink | null;
  magazine: BlogCreditLink | null;
  extras: BlogCreditExtra[];
  sourceUrl: string | null;
};

const MAX_EXTRAS = 12;
const MAX_NAME = 120;
const MAX_URL = 2000;

function trimName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_NAME);
  return trimmed || null;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_URL);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function link(raw: unknown): BlogCreditLink | null {
  if (!raw || typeof raw !== "object") return null;
  const name = trimName((raw as { name?: unknown }).name);
  if (!name) return null;
  return { name, url: httpsUrl((raw as { url?: unknown }).url) };
}

export function normalizeBlogCredits(raw: unknown): BlogCredits | null {
  if (raw == null) return null;
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const brand = link(record.brand);
  const photographer = link(record.photographer);
  const magazine = link(record.magazine);
  const extrasRaw = Array.isArray(record.extras) ? record.extras : [];
  const extras: BlogCreditExtra[] = [];
  for (const row of extrasRaw) {
    if (extras.length >= MAX_EXTRAS) break;
    if (!row || typeof row !== "object") continue;
    const role = trimName((row as { role?: unknown }).role);
    const name = trimName((row as { name?: unknown }).name);
    if (!role || !name) continue;
    extras.push({
      role,
      name,
      url: httpsUrl((row as { url?: unknown }).url),
    });
  }
  const sourceUrl = httpsUrl(record.sourceUrl);
  if (
    !brand &&
    !photographer &&
    !magazine &&
    extras.length === 0 &&
    !sourceUrl
  ) {
    return null;
  }
  return { brand, photographer, magazine, extras, sourceUrl };
}

export function hasDisplayableCredits(
  credits: BlogCredits | null,
  hasTalent: boolean,
): boolean {
  if (hasTalent) return true;
  return credits != null;
}
