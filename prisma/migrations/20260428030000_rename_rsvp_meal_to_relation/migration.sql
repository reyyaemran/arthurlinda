-- Replace `Rsvp.mealPreference` with structured relation columns:
--   relationSide  TEXT?  -- "GROOM" | "BRIDE"
--   relationType  TEXT?  -- "FAMILY" | "FRIEND" | "RELATIVE"
-- SQLite >= 3.35 supports DROP COLUMN; the bundled Node sqlite is well above that.

ALTER TABLE "Rsvp" DROP COLUMN "mealPreference";
ALTER TABLE "Rsvp" ADD COLUMN "relationSide" TEXT;
ALTER TABLE "Rsvp" ADD COLUMN "relationType" TEXT;
