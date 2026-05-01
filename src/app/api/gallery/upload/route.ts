import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";

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

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${roll.token}-${randomUUID()}.${ext}`;
  const relDir = path.join("uploads", "gallery");
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  const absPath = path.join(absDir, filename);
  await writeFile(absPath, bytes);

  const url = `/${relDir.replaceAll(path.sep, "/")}/${filename}`;
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
