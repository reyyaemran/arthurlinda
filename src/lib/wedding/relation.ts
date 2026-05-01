import type { GuestCategory, GuestSide } from "@/types/wedding";

/**
 * Sides offered to public RSVP submitters. Guest model also allows BOTH; that
 * value is admin-only (set on the Guest edit drawer) since a self-submitted
 * guest realistically picks one side.
 */
export const RSVP_SIDES: Extract<GuestSide, "GROOM" | "BRIDE">[] = ["GROOM", "BRIDE"];

/**
 * Categories offered to public RSVP submitters. The full GuestCategory enum
 * (incl. VIP / COLLEAGUE / OTHER) is available to admins on Guest edit.
 */
export const RSVP_CATEGORIES: Extract<
  GuestCategory,
  "FAMILY" | "RELATIVE" | "FRIEND"
>[] = ["FAMILY", "RELATIVE", "FRIEND"];

export const SIDE_LABEL: Record<GuestSide, string> = {
  GROOM: "Groom",
  BRIDE: "Bride",
  BOTH: "Both",
};

export const CATEGORY_LABEL: Record<GuestCategory, string> = {
  FAMILY: "Family",
  RELATIVE: "Relative",
  FRIEND: "Friend",
  VIP: "VIP",
  COLLEAGUE: "Colleague",
  OTHER: "Other",
};

/**
 * Build a short, human-friendly label for a side + category pair.
 *
 * Examples:
 *   ("GROOM", "FAMILY")    -> "Groom's family"
 *   ("BRIDE", "FRIEND")    -> "Bride's friend"
 *   ("GROOM", "RELATIVE")  -> "Groom's relative"
 *   ("BRIDE", null)        -> "Bride's side"
 *   (null, "FRIEND")       -> "Friend"
 *   ("BOTH", "FAMILY")     -> "Family (both sides)"
 *   (null, null)           -> ""
 */
export function formatRelation(
  side: GuestSide | null | undefined,
  category: GuestCategory | null | undefined,
): string {
  if (!side && !category) return "";
  if (side === "BOTH" && category) {
    return `${CATEGORY_LABEL[category]} (both sides)`;
  }
  if (side && category) {
    return `${SIDE_LABEL[side]}'s ${CATEGORY_LABEL[category].toLowerCase()}`;
  }
  if (side === "BOTH") return "Both sides";
  if (side) return `${SIDE_LABEL[side]}'s side`;
  if (category) return CATEGORY_LABEL[category];
  return "";
}

/** Coerce arbitrary input into a known GuestSide, or `undefined`. */
export function toGuestSide(value: unknown): GuestSide | undefined {
  return value === "GROOM" || value === "BRIDE" || value === "BOTH"
    ? value
    : undefined;
}

/** Coerce arbitrary input into a known GuestCategory, or `undefined`. */
export function toGuestCategory(value: unknown): GuestCategory | undefined {
  return value === "FAMILY" ||
    value === "RELATIVE" ||
    value === "FRIEND" ||
    value === "VIP" ||
    value === "COLLEAGUE" ||
    value === "OTHER"
    ? value
    : undefined;
}
