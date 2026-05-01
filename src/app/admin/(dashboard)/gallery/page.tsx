import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { networkInterfaces } from "node:os";

import { GalleryAdminPage } from "@/dashboard/pages/gallery";
import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

function detectLanIp(): string | null {
  const nets = networkInterfaces();
  for (const values of Object.values(nets)) {
    if (!values) continue;
    for (const ni of values) {
      if (ni.family === "IPv4" && !ni.internal) return ni.address;
    }
  }
  return null;
}

export default async function AdminGalleryPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) redirect("/admin/login");

  const [rolls] = await Promise.all([
    getPrisma().galleryRoll.findMany({
      where: { weddingId: wedding.id },
      include: {
        _count: { select: { photos: true } },
        photos: { orderBy: { createdAt: "desc" }, take: 9 },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let origin = configuredOrigin || `${proto}://${host}`;
  // If admin is opened on localhost, QR must use LAN IP for phone access.
  if (!configuredOrigin && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    const port = host.includes(":") ? host.split(":")[1] : "3000";
    const lanIp = detectLanIp();
    if (lanIp) origin = `http://${lanIp}:${port}`;
  }

  const initialRolls = rolls.map((r) => ({
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
  }));

  return (
    <GalleryAdminPage
      weddingId={wedding.id}
      origin={origin}
      sharedGalleryUrl={`${origin}/gallery/shared/${wedding.slug}`}
      initialRolls={initialRolls}
    />
  );
}
