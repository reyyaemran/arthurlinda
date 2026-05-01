import { NextResponse } from "next/server";
import { z } from "zod";

import { getWeddingBySlug } from "@/lib/wedding/queries";
import { getPrisma } from "@/lib/prisma";
import { findOrCreateGuestForRsvp } from "@/lib/wedding/guest-link";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    weddingSlug: z.string().min(1),
    name: z.string().min(1).max(200),
    phone: z.string().max(40).optional(),
    email: z.union([z.string().email(), z.literal("")]).optional(),
    attendance: z.enum(["yes", "no"]),
    paxCount: z.coerce.number().int().min(0).max(2),
    /** Whose side. Public form only ever sends GROOM/BRIDE; BOTH is admin-only. */
    side: z.enum(["GROOM", "BRIDE"]).optional(),
    /** Relation category. Public form only ever sends FAMILY/RELATIVE/FRIEND. */
    category: z.enum(["FAMILY", "RELATIVE", "FRIEND"]).optional(),
    message: z.string().max(2000).optional(),
  })
  .refine(
    (data) =>
      data.attendance === "no"
        ? data.paxCount === 0
        : data.paxCount >= 1 && data.paxCount <= 2,
    { message: "Party size must be 1 or 2 when attending, or 0 when not attending." },
  );

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      weddingSlug,
      name,
      phone,
      email,
      attendance,
      paxCount,
      side,
      category,
      message,
    } = parsed.data;

    const wedding = await getWeddingBySlug(weddingSlug.trim());
    if (!wedding) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    const attending = attendance === "yes";
    const finalPax = attending ? (paxCount ?? 1) : 0;

    // Auto-link / create a Guest record so the RSVP also shows up in the
    // admin's Guest list. Best-effort: if the guest-link write fails we still
    // store the RSVP itself (we don't want to lose a public submission).
    let guestId: string | null = null;
    try {
      guestId = await findOrCreateGuestForRsvp({
        weddingId: wedding.id,
        name,
        email: email && email.length > 0 ? email : null,
        phone: phone ?? null,
        side: side ?? null,
        category: category ?? null,
        paxCount: Math.max(1, finalPax || 1),
      });
    } catch (e) {
      console.error("[rsvp] failed to link Guest:", e);
    }

    // If we matched an existing Guest that already has an RSVP, update that
    // RSVP in place instead of creating a duplicate. This handles guests who
    // re-submit after changing their mind.
    const existingRsvp = guestId
      ? await getPrisma().rsvp.findUnique({ where: { guestId } })
      : null;

    const payload = {
      weddingId: wedding.id,
      name: name.trim(),
      phone: phone?.trim() || undefined,
      email: email && email.length > 0 ? email.trim() : undefined,
      attendance: (attending ? "CONFIRMED" : "DECLINED") as
        | "CONFIRMED"
        | "DECLINED",
      paxCount: finalPax,
      // Side/category captured regardless of attendance — useful for
      // tracking who's on which side even if they decline.
      side: side ?? null,
      category: category ?? null,
      message: message?.trim() || undefined,
    };

    if (existingRsvp) {
      await getPrisma().rsvp.update({
        where: { id: existingRsvp.id },
        data: payload,
      });
    } else {
      await getPrisma().rsvp.create({
        data: { ...payload, guestId: guestId ?? undefined },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
