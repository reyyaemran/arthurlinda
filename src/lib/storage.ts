/**
 * Object-storage helper for guest gallery photos and story art.
 *
 * Architecture (designed for many concurrent guests posting at the same time):
 *   1. Uploads bypass the Next.js / Vercel response payload limit by streaming
 *      directly into a public Supabase Storage bucket.
 *   2. Only the public URL is persisted in Postgres → DB rows stay tiny, list
 *      queries stay fast even with thousands of photos.
 *   3. Reads go through Supabase's CDN, so the wedding day traffic peak does
 *      not hit our serverless functions for image bytes.
 *   4. We never block the request on disk I/O (Vercel's filesystem is
 *      ephemeral and would throw under any meaningful load anyway).
 *
 * If the deployment hasn't configured Supabase Storage yet, helpers fall back
 * to a base64 `data:` URL so the app keeps working — but the operator should
 * configure storage before opening RSVP traffic.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_ENV =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "uploads";

let cachedClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
  if (!URL_ENV || !SECRET_ENV) return null;
  if (!cachedClient) {
    cachedClient = createClient(URL_ENV, SECRET_ENV, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

/** True when the project has the keys necessary to upload to Supabase Storage. */
export function isStorageConfigured(): boolean {
  return Boolean(URL_ENV && SECRET_ENV);
}

export type UploadInput = {
  /** Final binary payload to write (already validated/transformed). */
  data: Buffer | Uint8Array;
  /** Final MIME type of the payload (e.g. `image/jpeg`). */
  contentType: string;
  /** Subfolder inside the bucket (e.g. `gallery/<rollToken>/`). */
  folder: string;
  /** File extension WITHOUT a dot (e.g. `jpg`, `png`). */
  ext: string;
  /** Cache control override; defaults to 1 year (immutable, hashed name). */
  cacheControlSeconds?: number;
};

export type UploadResult = {
  /** Public CDN URL ready to be stored in Postgres / used in `<img src>`. */
  url: string;
  /** Internal storage path (used for deletion); `null` for fallback uploads. */
  storagePath: string | null;
};

function randomFileName(ext: string): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${base}.${ext}`;
}

/**
 * Upload an image to Supabase Storage and return its public URL.
 *
 * Falls back to an inline `data:` URL when Storage isn't configured so local
 * development without a Supabase project still works end-to-end.
 */
export async function uploadImage(input: UploadInput): Promise<UploadResult> {
  const supabase = getAdminClient();
  if (!supabase) {
    const buf = Buffer.isBuffer(input.data) ? input.data : Buffer.from(input.data);
    return {
      url: `data:${input.contentType};base64,${buf.toString("base64")}`,
      storagePath: null,
    };
  }

  const filename = randomFileName(input.ext);
  const folder = input.folder.replace(/^\/+|\/+$/g, "");
  const objectPath = folder ? `${folder}/${filename}` : filename;

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, input.data, {
    contentType: input.contentType,
    cacheControl: String(input.cacheControlSeconds ?? 31536000),
    upsert: false,
  });

  if (error) {
    // Surface the storage error to the caller so the API responds with a real
    // 500 instead of silently returning a broken URL.
    throw new Error(`storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return { url: data.publicUrl, storagePath: objectPath };
}

/**
 * Delete an object previously uploaded via {@link uploadImage}.
 *
 * Accepts either an explicit storage path (preferred) or a public URL produced
 * by Supabase Storage; legacy `data:` and local `/uploads/...` URLs are
 * silently ignored because there's nothing to delete from Storage.
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  const supabase = getAdminClient();
  if (!supabase) return;
  if (!url || url.startsWith("data:") || url.startsWith("/uploads/")) return;

  // Public URL pattern:
  //   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const objectPath = url.slice(idx + marker.length);
  if (!objectPath) return;

  await supabase.storage.from(BUCKET).remove([objectPath]);
}

/**
 * Build a thumbnail URL for a Supabase Storage public URL.
 *
 * Uses Supabase's built-in image transformation endpoint
 * (`/storage/v1/render/image/public/...`) so we never have to download the
 * full-size photo into the browser for grid views — saves dramatic amounts of
 * bandwidth when many guests are scrolling at once.
 *
 * Returns the input untouched for legacy `data:` / local URLs so existing
 * photos keep rendering.
 */
export function thumbnailUrl(
  url: string,
  options: { width: number; height?: number; quality?: number; resize?: "cover" | "contain" } = { width: 480 },
): string {
  if (!url) return url;
  if (url.startsWith("data:") || url.startsWith("/uploads/")) return url;

  const publicMarker = "/storage/v1/object/public/";
  const idx = url.indexOf(publicMarker);
  if (idx === -1) return url;

  const head = url.slice(0, idx);
  const rest = url.slice(idx + publicMarker.length); // <bucket>/<path...>

  const params = new URLSearchParams();
  params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  params.set("quality", String(options.quality ?? 70));
  params.set("resize", options.resize ?? "cover");

  return `${head}/storage/v1/render/image/public/${rest}?${params.toString()}`;
}
