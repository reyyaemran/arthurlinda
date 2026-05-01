-- Gallery rolls (QR per table) and uploaded photos.
CREATE TABLE "GalleryRoll" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "weddingId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "maxPhotos" INTEGER NOT NULL DEFAULT 5,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GalleryRoll_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GalleryRoll_token_key" ON "GalleryRoll"("token");
CREATE INDEX "GalleryRoll_weddingId_idx" ON "GalleryRoll"("weddingId");

CREATE TABLE "GalleryPhoto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "weddingId" TEXT NOT NULL,
  "rollId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GalleryPhoto_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GalleryPhoto_rollId_fkey"
    FOREIGN KEY ("rollId") REFERENCES "GalleryRoll" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GalleryPhoto_weddingId_idx" ON "GalleryPhoto"("weddingId");
CREATE INDEX "GalleryPhoto_rollId_createdAt_idx" ON "GalleryPhoto"("rollId", "createdAt");
