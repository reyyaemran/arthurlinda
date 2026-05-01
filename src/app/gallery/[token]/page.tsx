import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/prisma";
import { GalleryCapturePage } from "@/landing/components/gallery-capture-page";

export default async function PublicGalleryCapturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const prisma = getPrisma();
  const roll = await prisma.galleryRoll.findUnique({
    where: { token },
    include: {
      wedding: {
        select: {
          groomName: true,
          brideName: true,
          eventDate: true,
        },
      },
      _count: { select: { photos: true } },
    },
  });
  if (!roll) notFound();
  const recentWeddingPhotos = await prisma.galleryPhoto.findMany({
    where: { weddingId: roll.weddingId },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return (
    <GalleryCapturePage
      token={roll.token}
      label={roll.label}
      maxPhotos={roll.maxPhotos}
      filterMode={roll.filterMode}
      initialPhotoCount={roll._count.photos}
      weddingNames={`${roll.wedding.groomName} & ${roll.wedding.brideName}`}
      eventDateIso={roll.wedding.eventDate.toISOString()}
      initialPhotos={recentWeddingPhotos.map((p) => ({
        id: p.id,
        url: p.url,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
