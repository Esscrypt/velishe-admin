# Image upload UX & quality improvements — design

Date: 2026-06-04
Repo: modeling-portfolio-admin (admin panel; `components/ModelForm.tsx` + `app/api/upload`, `app/api/images/reorder`)

## Context

Three related problems with the admin image workflow surfaced after the
reliability/draft-gate work:

1. **No upload feedback.** Uploading many images shows only a single "saving"
   spinner. The user can't tell what's in flight, what's done, or which image
   failed (uploads run in parallel via `Promise.allSettled` + `uploadWithRetry`).
2. **Pixelated images.** Every image is downscaled and recompressed **twice** —
   the client shrinks to 1200×1600 @ WebP 0.85 (`autoResizeImage`), then the
   server shrinks again (featured 1200×1600, gallery only **1080×1440**) @ WebP
   85. The gallery cap plus double recompression makes images look soft when
   displayed large.
3. **Digital ordering doesn't persist.** The UI lets you drag digitals, but the
   new order is never reliably saved: new models have no digital-reorder step,
   and the existing-model path matches freshly-added digitals by their `blob:`
   preview URL against the DB data-URI `src`, which never matches.

Storage stays **base64 in Postgres** (object storage was deferred). This bounds
quality: request bodies must stay under Vercel's ~4.5 MB limit, so true
originals are out of scope here.

## Goals / non-goals

- Goal: per-image live status during upload; sharper images; digital order that
  sticks.
- Non-goal: object storage migration; byte-level upload percentages; a
  manual per-image retry button (auto-retry already covers transient failures).

---

## Feature 1 — Live per-image upload progress

**Approach.** Keep the existing `fetch`/`uploadWithRetry` flow; drive a
per-item **status map** in React state. Discrete states (not byte %) because the
meaningful work is server-side (Sharp + DB insert) and `fetch` exposes no body
progress.

**Stable IDs.** `images` and `digitals` state items currently have no stable id.
Add `clientId: crypto.randomUUID()` when files are added (in `handleDrop`,
`handleFileInput`, `handleDigitalsDrop`, `handleDigitalsInput`). This id keys
both the thumbnail and its upload promise.

**Status state.**
```ts
type UploadState = "queued" | "uploading" | "done" | "error";
type UploadStatus = { state: UploadState; attempt: number; error?: string };
const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});
```
- On submit: every to-be-uploaded item → `{ state: "queued", attempt: 0 }`.
- When an item's upload starts → `uploading`.
- On success → `done`; on final failure → `error` with message.
- Reset to `{}` when the submit settles (success or abort) and on form close.

**Retry visibility.** Extend `uploadWithRetry(body, attempts, onAttempt?)` with
an optional `onAttempt(attempt: number)` callback invoked before each try, so a
retrying image can show "retry 2/3".

**UI — thumbnail overlay** (in `SortableImageItem`, used by both images and
digitals grids): render a status badge driven by the item's `uploadStatus`:
- `queued` → faint clock, tile at full opacity
- `uploading` → dim tile + spinner (+ "retry n/3" if attempt > 1)
- `done` → green check (brief)
- `error` → red ⚠ with the error message as tooltip; tile outlined red
`SortableImageItem` gains a `status?: UploadStatus` prop. While `saving`, drag
and the remove button are disabled.

**UI — aggregate.** Near the Save button: `Uploaded {done}/{total}` while
saving; the Save button label reflects the count instead of a generic spinner.

**Scope.** Both images and digitals, in both the new-model and existing-model
submit paths. Statuses reset on completion/close.

**Failure behavior.** Unchanged: the new-model orphan-cleanup + alert still
fire, but the user sees which thumbnails went red first.

---

## Feature 2 — Better image quality (single high-quality resize)

**Principle: resize once, on the server, at higher dimensions/quality.** Stop
the aggressive client downscale; the client only guards the upload-size limit.

**Client (`ModelForm.tsx`).**
- Replace the `autoResizeImage` 1200×1600 @ 0.85 behavior with a **safety-only**
  downscale: if the source's long edge ≤ ~3000 px AND the file is under a safe
  upload size (~4 MB), send the **original file unchanged**; otherwise downscale
  to a ~3000 px long edge at WebP quality **0.92** purely to fit the upload
  limit. This preserves a high-quality source for the server.
- `resizeImage` (the manual "resize options" helper) default quality 0.85 → 0.92.

**Server (`app/api/upload/route.ts`).**
- Raise output dimensions: featured **2000×2667**, gallery **1600×2133**
  (`fit: inside`, `withoutEnlargement: true` — never upscale).
- WebP `quality: 90` (from 85); keep `effort: 4`.
- Single resize from the (now higher-quality) uploaded source.

**Trade-off acknowledged.** Stored WebP grows to ~0.4–1 MB/image (from ~150–300
KB). Request bodies stay under 4.5 MB because of the client safety cap.
Re-uploading an existing model's images is required to benefit; old images keep
their current resolution until replaced.

---

## Feature 3 — Reliable digital ordering

**Root cause.** Digital order is assigned a *random* temp value at upload and
never authoritatively reordered (new models), or reordered via fragile
`blob:`-vs-data-URI `src` matching (existing models).

**Fix — mirror the gallery pattern using returned image ids.**
- `/api/upload` already returns `imageId` for each upload. Collect digital
  upload results into an `uploadedDigitalIds: { index, imageId }[]` array in
  **both** submit paths (the new-model path currently collects only gallery ids).
- After uploads, build `digitalOrders` as `{ [imageId]: 1000 + index }` from the
  returned ids (and existing digitals' real ids), and POST to
  `/api/images/reorder` — for new models too.
- Stop matching by `src`; match by the upload-returned id. Existing (already
  persisted) digitals keep matching by their real id.

`/api/images/reorder` already does a safe two-phase (negative temp values inside
a transaction), so the high digital orders (1000+) coexist with gallery orders
(0..n) without unique(model_id, order) conflicts. No reorder-endpoint change
needed.

---

## Components touched

- `components/ModelForm.tsx` — clientIds, `uploadStatus` state, status wiring in
  all upload loops, aggregate UI, client resize change, digital-id collection +
  reorder in both paths. `SortableImageItem` gains a `status` prop + overlay.
- `app/api/upload/route.ts` — output dimensions + WebP quality.
- (No DB schema or reorder-endpoint changes.)

## Error handling

- Upload errors: per-image `error` status + existing alert + (new-model)
  orphan-cleanup. Reorder failures remain non-fatal (logged), consistent with
  current behavior.
- Client resize failure: existing `alert("Failed to resize image")` path.

## Testing / verification

- Manual: add 6–8 images + digitals; observe queued → uploading → done; throttle
  network / force a 500 to see retry counts and a red error badge.
- Manual: reorder digitals, save, reload model → order persists; same for a brand
  new model.
- Manual: upload a high-res photo; confirm the result is visibly sharper than
  before and the stored image is larger but the page still loads.
- Unit-testable seam: `uploadWithRetry`'s `onAttempt` callback (attempt counting
  and retry/no-retry on status codes).
- `bun run build` passes for the admin app (lint script is pre-broken in this
  repo, independent of these changes).
```
