import postgres from "postgres";
import sharp from "sharp";
import { config } from "dotenv";
import { dhashFromGrayscale, DHASH_WIDTH, DHASH_HEIGHT } from "../lib/phash";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl:
    process.env.NODE_ENV === "production" || process.env.VERCEL
      ? { rejectUnauthorized: false }
      : undefined,
});

function dataUriToBuffer(dataUri: string): Buffer | null {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) return null;
  try {
    return Buffer.from(dataUri.slice(commaIndex + 1), "base64");
  } catch {
    return null;
  }
}

async function computePhash(dataUri: string): Promise<string | null> {
  const buffer = dataUriToBuffer(dataUri);
  if (!buffer) return null;

  const { data } = await sharp(buffer)
    .resize(DHASH_WIDTH, DHASH_HEIGHT, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = data.length / (DHASH_WIDTH * DHASH_HEIGHT);
  const gray = new Uint8Array(DHASH_WIDTH * DHASH_HEIGHT);
  for (let i = 0; i < gray.length; i++) {
    const base = i * channels;
    const r = data[base];
    const g = channels > 1 ? data[base + 1] : r;
    const b = channels > 2 ? data[base + 2] : r;
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return dhashFromGrayscale(gray, DHASH_WIDTH, DHASH_HEIGHT);
}

async function main() {
  const rows = await sql<{ id: string; data: string }[]>`
    SELECT id, data FROM images WHERE phash IS NULL
  `;
  console.log(`Found ${rows.length} image(s) without a phash`);

  let updated = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const phash = await computePhash(row.data);
      if (!phash) {
        failed++;
        continue;
      }
      await sql`UPDATE images SET phash = ${phash} WHERE id = ${row.id}`;
      updated++;
      if (updated % 25 === 0) console.log(`  ...${updated} updated`);
    } catch (error) {
      failed++;
      console.error(
        `Failed for image ${row.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(`Done. Updated ${updated}, failed ${failed}.`);
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
