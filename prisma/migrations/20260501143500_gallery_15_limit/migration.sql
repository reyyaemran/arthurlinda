-- Raise default and existing table-roll photo limit to 15.
UPDATE "GalleryRoll" SET "maxPhotos" = 15 WHERE "maxPhotos" <> 15;
