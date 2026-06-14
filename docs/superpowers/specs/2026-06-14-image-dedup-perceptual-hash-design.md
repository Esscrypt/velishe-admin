# Image De-duplication via Perceptual Hash (dHash)

- **Date:** 2026-06-14
- **Repo:** modeling-portfolio-admin (admin only; public portfolio unaffected)
- **Status:** Approved design, pending implementation plan

## Summary

Prevent the same photo from being uploaded twice to a single model. When an
admin adds images that look like photos already present on that model, warn them
and let them decide (Skip / Add anyway). Detection uses a perceptual hash
(dHash), so it catches re-encoded, resized, or format-converted copies — not
just byte-identical re-uploads.

## Requirements (decisions)

| Dimension | Decision |
|-----------|----------|
| Scope | Within a single model (its gallery + digitals). No cross-model checks. |
| Behaviour on hit | Warn and let the admin decide per image (Skip / Add anyway). Never silently drop, never hard-block. |
| Detection method | Perceptual hash (dHash), Hamming-distance comparison. |
| Starting threshold | Hamming distance ≤ 6 of 64 bits. Tunable constant. |

## Non-goals

- No cross-model duplicate detection.
- No hard DB unique constraint on the hash (it would break "Add anyway").
- No perceptual clustering / "find all similar" UI — only the add-time warning.
- No change to the public portfolio repo. Its image queries select explicit
  columns and never reference the new column.

## Algorithm: dHash

1. Decode the image and downscale to **9×8 grayscale** (luma = 0.299R + 0.587G
   + 0.114B).
2. For each of the 8 rows, compare each pixel to its right neighbour: 8
   comparisons × 8 rows = **64 bits**. Bit = 1 if the left pixel is brighter.
3. Serialize the 64 bits to a 16-char hex string.
4. Two images are near-duplicates when `hamming(a, b) ≤ THRESHOLD` (popcount of
   `a XOR b`). `THRESHOLD = 6` initially.

dHash is robust to resize and re-encode because it downscales to 9×8 before
hashing, so resolution and compression barely affect the result.

## Architecture

### 1. Shared, framework-agnostic core — `lib/phash.ts`
Pure functions, no DOM and no sharp dependency:
- `dhashFromGrayscale(pixels: Uint8Array /* 9*8 */): string` — produces the hex hash.
- `hamming(a: string, b: string): number` — bit difference between two hex hashes.

Both the browser (canvas-decoded pixels) and the backfill script
(sharp-decoded pixels) call the *same* `dhashFromGrayscale`; only the decode
step differs, and the threshold absorbs that small difference.

### 2. Client hashing — reuse the existing decode in `autoResizeImage`
`autoResizeImage` already decodes the source `Image`. Extend it to also draw a
9×8 grayscale to a small canvas, read the pixels, and return `phash` alongside
`resizedData`/`resizedFile`/`width`/`height`. Every added image carries a
`phash` from the moment it is dropped — no second decode.

### 3. Data model — new `phash` column
```
images.phash  text  NULL
```
Nullable (older rows are null until backfilled). Generated and applied with
Drizzle (`bun run db:generate` → `bun run db:migrate`). No unique constraint.
Per-model lookups already filter by `model_id` (covered by the existing
`unique(model_id, order)`), so a dedicated index is optional.

### 4. Existing hashes reach the client via the model GET
`GET /api/models/[id]` includes `phash` on each returned image. The edit form
already loads the model's images; adding a 16-char field per image is
negligible. These are the hashes new additions are compared against.

### 5. The check is client-side, before any upload
In the add handlers (`handleDrop`, `handleFileInput`, `handleDigitalsDrop`,
`handleDigitalsInput`), after computing each new image's `phash`, compare it
against:
- the model's **existing** image phashes (from the GET, held in `formData`), and
- the **other new images** in the same batch.

Any pair within `THRESHOLD` flags the new image as a suspected duplicate.

### 6. Warn UX
If any added image is flagged, show a dialog listing each suspected duplicate:
the new image beside the matched existing image, with **Skip** / **Add anyway**
per row, plus **Skip all** / **Add all anyway**. Skipped images never enter the
form state; "Add anyway" lets them proceed normally. Because the check is
pre-upload, there is no re-upload round-trip.

### 7. Upload stores the hash
`/api/upload` (PUT) accepts a `phash` form field and writes it to the new
column on insert. The server trusts the client-computed value (not
security-sensitive). Storing the client's original-image phash keeps future
comparisons original-vs-original and therefore maximally consistent.

### 8. Backfill — `scripts/backfill-phash.ts`
One-off script: iterate `images` rows, decode each stored base64 with sharp to
9×8 grayscale, call the shared `dhashFromGrayscale`, and update `phash`. This
makes the existing catalogue participate in dedup, not just new uploads.
Backfilled hashes derive from the resized stored bytes rather than the original,
but dHash's 9×8 downscale keeps them within the threshold.

## Data flow

```
add image ──> autoResizeImage(decode once) ──> { resizedFile, phash }
                                  │
                                  ▼
        compare phash vs (existing model phashes ∪ batch phashes)
                                  │
                 within THRESHOLD?│
                       ┌──────────┴───────────┐
                      yes                      no
                       │                        │
              warn dialog (Skip / Add)   add to form state
                       │
        Skip ─ drop;  Add anyway ─ add to form state
                                  │
                            on save ──> PUT /api/upload (file + phash)
                                  │
                            store data + phash
```

## Files to change (admin)

- `lib/phash.ts` — new shared core (`dhashFromGrayscale`, `hamming`).
- `lib/db/schema.ts` — add `phash` column; new Drizzle migration.
- `components/ModelForm.tsx` — compute phash in `autoResizeImage`; carry it on
  gallery/digital items; add-time comparison; warn dialog; send `phash` on upload.
- `app/api/upload/route.ts` — accept and store `phash`.
- `app/api/models/[id]/route.ts` (GET) — include `phash` per image.
- `scripts/backfill-phash.ts` — new one-off backfill.

## Threshold & tuning

`THRESHOLD = 6` is the starting point — tight enough to avoid most burst-shot
false positives, loose enough to catch re-encodes. It is a single constant in
`lib/phash.ts` to adjust after testing on real photos. Lower (4) = stricter,
fewer false alarms but may miss heavier re-compressions; higher (8–10) = catches
more but risks flagging similar-but-distinct shots.

## Testing

- Unit-test `lib/phash.ts`: known pixel grids → expected hex; `hamming`
  correctness; identical image at two sizes → distance ≤ threshold; clearly
  different images → distance well above threshold. (`bun test`.)
- Manual: re-add the same file (distance 0); add a re-exported/resized copy
  (small distance, flagged); add two distinct burst shots (verify they are not
  falsely flagged at the chosen threshold).

## Risks / limitations

- Perceptual hashing can false-positive on visually similar but distinct photos
  (common in portfolios). Mitigated by the warn-don't-block UX and a tunable
  threshold.
- Pre-feature images are only deduped after the backfill runs.
- Client (canvas) and backfill (sharp) decode paths differ slightly; the
  threshold is sized to absorb the resulting Hamming noise.
