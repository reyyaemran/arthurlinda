import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/** First bytes → expected mime (subset) for basic content sniffing. */
function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  return null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 4MB or smaller" }, { status: 400 });
  }

  const declared = file.type;
  if (!MIME_TO_EXT[declared]) {
    return NextResponse.json({ error: "Use JPEG, PNG, WebP, or GIF" }, { status: 400 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageMime(buf);
  if (!sniffed || sniffed !== declared) {
    return NextResponse.json({ error: "File content does not match an allowed image type" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[declared];
  const isServerlessRuntime = process.env.VERCEL === "1" || !!process.env.AWS_REGION;

  if (isServerlessRuntime) {
    // Vercel filesystem is ephemeral; keep image in DB-friendly data URL.
    return NextResponse.json({ url: `data:${declared};base64,${Buffer.from(buf).toString("base64")}` });
  }

  const id = crypto.randomUUID();
  const filename = `${id}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "story");
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);

  try {
    await writeFile(fullPath, buf);
  } catch (e) {
    console.error("story-image write failed", e);
    return NextResponse.json({ error: "Could not save story image." }, { status: 500 });
  }

  return NextResponse.json({ url: `/uploads/story/${filename}` });
}
