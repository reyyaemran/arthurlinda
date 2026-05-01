import type { Guest, RsvpStatus } from "@/types/wedding";

/**
 * Pax summed for headline aggregates (Guests "Total Pax", dashboard "Total invited").
 *
 * Manual guests without a linked RSVP (`hasLinkedRsvp` false) → `invitedPax` counts
 * toward planning totals.
 *
 * Guests with a linked RSVP row → only CONFIRMED counts (uses RSVP pax as source of
 * truth via `confirmedPax` / `linked.paxCount`). PENDING and DECLINED contribute 0.
 */
export function totalPlanningPaxForGuest(
  invitedPax: number,
  linked: { attendance: RsvpStatus; paxCount: number } | undefined,
): number {
  if (!linked) return invitedPax;
  if (linked.attendance === "CONFIRMED") return linked.paxCount;
  return 0;
}

/** Same logic with a mapped Guest view-model (queries layer). */
export function totalPlanningPaxForGuestVm(guest: Guest): number {
  if (!guest.hasLinkedRsvp) return guest.invitedPax;
  if (guest.rsvpStatus === "CONFIRMED") return guest.confirmedPax;
  return 0;
}
