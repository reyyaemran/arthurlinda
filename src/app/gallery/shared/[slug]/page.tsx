import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/prisma";
import { getWeddingBySlug } from "@/lib/wedding/queries";
import { GallerySharedPage } from "@/landing/components/gallery-shared-page";

export default async function PublicSharedGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await getWeddingBySlug(slug);
  if (!wedding) notFound();

  const photos = await getPrisma().galleryPhoto.findMany({
    where: { weddingId: wedding.id },
    orderBy: { createdAt: "desc" },
    take: 240,
    include: {
      roll: { select: { label: true } },
    },
  });

  return (
    <GallerySharedPage
      weddingNames={`${wedding.groomName} & ${wedding.brideName}`}
      photos={photos.map((p) => ({
        id: p.id,
        url: p.url,
        rollLabel: p.roll.label,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
