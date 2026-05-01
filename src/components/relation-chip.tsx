"use client";

import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, SIDE_LABEL } from "@/lib/wedding/relation";
import { GLASS, GLASS_PILL_BASE } from "@/components/ui/status-badge";
import type { GuestCategory, GuestSide } from "@/types/wedding";

const relationChipBase = cn(
  GLASS_PILL_BASE,
  GLASS.neutralSoft,
  "px-2 py-0.5 text-[9.5px]",
);

/** Same glass pill as RSVP list rows (`Arthur's family`-style labeling). */
export function RelationChip({
  side,
  category,
  groomName,
  brideName,
}: {
  side?: GuestSide;
  category?: GuestCategory;
  groomName?: string;
  brideName?: string;
}) {
  if (!side && !category) return null;

  const sideLabel = side
    ? side === "GROOM"
      ? groomName?.trim() || SIDE_LABEL.GROOM
      : side === "BRIDE"
        ? brideName?.trim() || SIDE_LABEL.BRIDE
        : SIDE_LABEL.BOTH
    : null;
  const categoryLabel = category ? CATEGORY_LABEL[category] : null;

  let label: string;
  if (side === "BOTH" && categoryLabel) label = `${categoryLabel} (both sides)`;
  else if (sideLabel && categoryLabel) label = `${sideLabel}'s ${categoryLabel.toLowerCase()}`;
  else if (sideLabel) label = side === "BOTH" ? "Both sides" : `${sideLabel}'s side`;
  else label = categoryLabel!;

  return <span className={relationChipBase}>{label}</span>;
}
