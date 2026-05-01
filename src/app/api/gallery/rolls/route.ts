import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

const bodySchema = z.object({
  weddingId: z.string().min(1),
  label: z.string().min(1).max(80),
  maxPhotos: z.number().int().min(1).max(50).default(15),
  filterMode: z.enum(["VINTAGE", "ORIGINAL"]).default("VINTAGE"),
});

function newToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rolls = await getPrisma().galleryRoll.findMany({
    where: { weddingId: wedding.id },
    include: {
      _count: { select: { photos: true } },
      photos: { orderBy: { createdAt: "desc" }, take: 9 },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    rolls: rolls.map((r) => ({
      id: r.id,
      label: r.label,
      token: r.token,
      maxPhotos: r.maxPhotos,
      filterMode: r.filterMode,
      photoCount: r._count.photos,
      createdAt: r.createdAt.toISOString(),
      photos: r.photos.map((p) => ({
        id: p.id,
        url: p.url,
        createdAt: p.createdAt.toISOString(),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding || wedding.id !== parsed.data.weddingId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roll = await getPrisma().galleryRoll.create({
    data: {
      weddingId: wedding.id,
      label: parsed.data.label.trim(),
      maxPhotos: parsed.data.maxPhotos,
      filterMode: parsed.data.filterMode,
      token: newToken(),
    },
    include: { _count: { select: { photos: true } } },
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
    },
  });
}
