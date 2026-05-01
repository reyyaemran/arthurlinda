import type { Guest as PrismaGuest } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import { toGuestCategory, toGuestSide } from "@/lib/wedding/relation";
import type { GuestCategory, GuestSide } from "@/types/wedding";

/** Internal marker stored in `Guest.notes` so we can identify auto-linked guests. */
export const FROM_RSVP_MARKER = "[from-rsvp]";

const normalizeName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const normalizeEmail = (s: string) => s.trim().toLowerCase();
const normalizePhone = (s: string) => s.replace(/\D+/g, "");

type RsvpInput = {
  weddingId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  side?: string | null;
  category?: string | null;
  paxCount: number;
};

/**
 * Try to find an existing Guest for the given RSVP submission, or create one.
 *
 * Matching priority (within the same wedding):
 *   1. exact (case-insensitive) email match
 *   2. digits-only phone match
 *   3. normalised name match
 *
 * When matched: we DON'T overwrite the admin's existing Guest fields with RSVP
 * values — the admin's manual input remains the source of truth. We only fill
 * in fields that are currently empty.
 *
 * When not matched: we create a new Guest with the RSVP data, defaulting
 * `invitedPax` to whatever the guest is bringing. The internal `[from-rsvp]`
 * notes marker lets the UI label these rows.
 *
 * Returns the resolved `guest.id`.
 */
export async function findOrCreateGuestForRsvp(rsvp: RsvpInput): Promise<string> {
  const prisma = getPrisma();

  const sideValue: GuestSide | undefined = toGuestSide(rsvp.side);
  const categoryValue: GuestCategory | undefined = toGuestCategory(rsvp.category);
  const trimmedEmail = rsvp.email?.trim() || null;
  const trimmedPhone = rsvp.phone?.trim() || null;

  const candidates = await prisma.guest.findMany({
    where: { weddingId: rsvp.weddingId },
  });

  const wantedName = normalizeName(rsvp.name);
  const wantedEmail = trimmedEmail ? normalizeEmail(trimmedEmail) : null;
  const wantedPhone = trimmedPhone ? normalizePhone(trimmedPhone) : null;

  let match: PrismaGuest | undefined;
  if (wantedEmail) {
    match = candidates.find(
      (g) => g.email && normalizeEmail(g.email) === wantedEmail,
    );
  }
  if (!match && wantedPhone) {
    match = candidates.find(
      (g) => g.phone && normalizePhone(g.phone).length > 0 && normalizePhone(g.phone) === wantedPhone,
    );
  }
  if (!match && wantedName) {
    match = candidates.find((g) => normalizeName(g.name) === wantedName);
  }

  if (match) {
    // Fill in any blanks the RSVP provides, but don't override existing values.
    const data: Partial<PrismaGuest> = {};
    if (!match.email && trimmedEmail) data.email = trimmedEmail;
    if (!match.phone && trimmedPhone) data.phone = trimmedPhone;
    if (Object.keys(data).length > 0) {
      await prisma.guest.update({ where: { id: match.id }, data });
    }
    return match.id;
  }

  const created = await prisma.guest.create({
    data: {
      weddingId: rsvp.weddingId,
      name: rsvp.name.trim(),
      email: trimmedEmail,
      phone: trimmedPhone,
      category: categoryValue ?? "FRIEND",
      side: sideValue ?? "BOTH",
      // Auto-created guests inherit the RSVP's pax — admin can adjust.
      invitedPax: Math.max(1, rsvp.paxCount || 1),
      notes: FROM_RSVP_MARKER,
    },
  });

  return created.id;
}

/**
 * After an RSVP changes, mirror its name/phone/email/side/category onto the
 * linked Guest so both views stay consistent.
 *
 * Only touches the columns we care about (so admin-only fields like
 * `tableNumber`, `invitedPax`, `notes` are preserved).
 */
export async function mirrorRsvpToGuest(
  guestId: string,
  changes: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    side?: string | null;
    category?: string | null;
  },
): Promise<void> {
  const data: Record<string, unknown> = {};

  if (changes.name !== undefined) data.name = changes.name.trim();
  if (changes.email !== undefined) data.email = changes.email?.trim() || null;
  if (changes.phone !== undefined) data.phone = changes.phone?.trim() || null;
  if (changes.side !== undefined) {
    const v = toGuestSide(changes.side);
    if (v) data.side = v;
  }
  if (changes.category !== undefined) {
    const v = toGuestCategory(changes.category);
    if (v) data.category = v;
  }

  if (Object.keys(data).length === 0) return;
  await getPrisma().guest.update({ where: { id: guestId }, data });
}
