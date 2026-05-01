import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const prisma = getPrisma();
  const roll = await prisma.galleryRoll.findUnique({
    where: { token },
    include: {
      wedding: { select: { groomName: true, brideName: true } },
      _count: { select: { photos: true } },
    },
  });
  if (!roll) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const recentWeddingPhotos = await prisma.galleryPhoto.findMany({
    where: { weddingId: roll.weddingId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return NextResponse.json({
    roll: {
      id: roll.id,
      label: roll.label,
      token: roll.token,
      maxPhotos: roll.maxPhotos,
      filterMode: roll.filterMode,
      photoCount: roll._count.photos,
      wedding: roll.wedding,
    },
    photos: recentWeddingPhotos.map((p) => ({
      id: p.id,
      url: p.url,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
