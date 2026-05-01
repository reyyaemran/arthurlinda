import type { GuestCategory, GuestSide, RsvpStatus } from "@/types/wedding";

export const PDF_GUEST_CATEGORY: Record<GuestCategory, string> = {
  FAMILY: "Family",
  RELATIVE: "Relative",
  FRIEND: "Friend",
  VIP: "VIP",
  COLLEAGUE: "Colleague",
  OTHER: "Other",
};

export const PDF_GUEST_SIDE: Record<GuestSide, string> = {
  GROOM: "Groom",
  BRIDE: "Bride",
  BOTH: "Both",
};

export const PDF_RSVP_STATUS: Record<RsvpStatus, string> = {
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  PENDING: "Pending",
};
