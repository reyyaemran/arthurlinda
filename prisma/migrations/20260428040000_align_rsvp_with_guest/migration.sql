-- Align Rsvp fields 1:1 with Guest:
--   relationSide -> side  (uses GuestSide values: GROOM | BRIDE | BOTH)
--   relationType -> category  (uses GuestCategory values; RELATIVE was added)
--   drop dietaryNotes (rolled into "message" or dropped — RSVP stays simpler)
-- SQLite >= 3.25 supports RENAME COLUMN; >= 3.35 supports DROP COLUMN.

ALTER TABLE "Rsvp" RENAME COLUMN "relationSide" TO "side";
ALTER TABLE "Rsvp" RENAME COLUMN "relationType" TO "category";
ALTER TABLE "Rsvp" DROP COLUMN "dietaryNotes";
