import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "").trim();
  const file = form.get("file");
  if (!token || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image is too large" }, { status: 400 });
  }

  const roll = await getPrisma().galleryRoll.findUnique({
    where: { token },
    include: { _count: { select: { photos: true } } },
  });
  if (!roll) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (roll._count.photos >= roll.maxPhotos) {
    return NextResponse.json({ error: "This disposable roll is full" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const ext = mimeType === "image/png" ? "png" : "jpg";

  let url: string;
  try {
    const result = await uploadImage({
      data: bytes,
      contentType: mimeType,
      folder: `gallery/${roll.token}`,
      ext,
    });
    url = result.url;
  } catch (err) {
    console.error("gallery upload failed", err);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  const photo = await getPrisma().galleryPhoto.create({
    data: {
      weddingId: roll.weddingId,
      rollId: roll.id,
      url,
    },
  });

  return NextResponse.json({
    photo: {
      id: photo.id,
      url: photo.url,
      createdAt: photo.createdAt.toISOString(),
    },
  });
}
