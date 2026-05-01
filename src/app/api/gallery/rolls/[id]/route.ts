import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

const patchSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  filterMode: z.enum(["VINTAGE", "ORIGINAL"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { id } = await params;
  const existing = await getPrisma().galleryRoll.findUnique({ where: { id } });
  if (!existing || existing.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const roll = await getPrisma().galleryRoll.update({
    where: { id },
    data: {
      ...(parsed.data.label ? { label: parsed.data.label.trim() } : {}),
      ...(parsed.data.filterMode ? { filterMode: parsed.data.filterMode } : {}),
    },
    include: {
      _count: { select: { photos: true } },
      photos: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });

  return NextResponse.json({
    roll: {
      id: roll.id,
      label: roll.label,
      token: roll.token,
      maxPhotos: roll.maxPhotos,
      filterMode: roll.filterMode,
      photoCount: roll._count.photos,
      createdAt: roll.createdAt.toISOString(),
      photos: roll.photos.map((p) => ({
        id: p.id,
        url: p.url,
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const roll = await getPrisma().galleryRoll.findUnique({
    where: { id },
    include: { photos: true },
  });
  if (!roll || roll.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await getPrisma().galleryRoll.delete({ where: { id } });

  await Promise.all(
    roll.photos.map(async (p) => {
      if (!p.url.startsWith("/uploads/gallery/")) return;
      const rel = p.url.replace(/^\//, "");
      const abs = path.join(process.cwd(), "public", rel);
      await unlink(abs).catch(() => {});
    }),
  );

  return NextResponse.json({ ok: true });
}
