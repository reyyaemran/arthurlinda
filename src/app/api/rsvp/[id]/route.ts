import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { mirrorRsvpToGuest } from "@/lib/wedding/guest-link";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    attendance: z.enum(["PENDING", "CONFIRMED", "DECLINED"]).optional(),
    /** Pass `null` to clear, omit to leave untouched. */
    side: z.enum(["GROOM", "BRIDE", "BOTH"]).nullable().optional(),
    /** Pass `null` to clear, omit to leave untouched. */
    category: z
      .enum(["FAMILY", "RELATIVE", "FRIEND", "VIP", "COLLEAGUE", "OTHER"])
      .nullable()
      .optional(),
  })
  .refine(
    (d) =>
      d.attendance !== undefined ||
      d.side !== undefined ||
      d.category !== undefined,
    { message: "Provide at least one field to update." },
  );

async function resolveRsvp(rsvpId: string, userId: string) {
  const wedding = await getWeddingForUser(userId);
  if (!wedding) return null;
  const row = await getPrisma().rsvp.findUnique({ where: { id: rsvpId } });
  if (!row || row.weddingId !== wedding.id) return null;
  return row;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await resolveRsvp(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const { attendance, side, category } = parsed.data;

    const data: {
      attendance?: "PENDING" | "CONFIRMED" | "DECLINED";
      side?: string | null;
      category?: string | null;
    } = {};
    if (attendance !== undefined) data.attendance = attendance;
    if (side !== undefined) data.side = side;
    if (category !== undefined) data.category = category;

    await getPrisma().rsvp.update({ where: { id }, data });

    // Mirror side/category onto the linked Guest so both lists stay aligned.
    if (existing.guestId && (side !== undefined || category !== undefined)) {
      try {
        await mirrorRsvpToGuest(existing.guestId, { side, category });
      } catch (e) {
        console.error("[rsvp] failed to mirror to Guest:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await resolveRsvp(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await getPrisma().rsvp.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
