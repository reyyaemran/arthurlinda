import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { deleteImageByUrl } from "@/lib/storage";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const photo = await getPrisma().galleryPhoto.findUnique({ where: { id } });
  if (!photo || photo.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await getPrisma().galleryPhoto.delete({ where: { id } });

  if (photo.url.startsWith("/uploads/gallery/")) {
    const rel = photo.url.replace(/^\//, "");
    const abs = path.join(process.cwd(), "public", rel);
    await unlink(abs).catch(() => {});
  } else {
    // Best-effort Storage cleanup; data: URLs and unknown hosts are no-ops.
    await deleteImageByUrl(photo.url).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
