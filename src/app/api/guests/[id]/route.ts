import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  category: z.enum(["FAMILY", "RELATIVE", "FRIEND", "VIP", "COLLEAGUE", "OTHER"]),
  side: z.enum(["GROOM", "BRIDE", "BOTH"]),
  invitedPax: z.coerce.number().int().min(1),
  tableNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

async function resolveGuest(guestId: string, userId: string) {
  const wedding = await getWeddingForUser(userId);
  if (!wedding) return null;
  const guest = await getPrisma().guest.findUnique({ where: { id: guestId } });
  if (!guest || guest.weddingId !== wedding.id) return null;
  return guest;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const guest = await resolveGuest(id, session.user.id);
  if (!guest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const json = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, phone, email, category, side, invitedPax, tableNumber, notes } = parsed.data;

    const updated = await getPrisma().guest.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        category,
        side,
        invitedPax,
        tableNumber: tableNumber?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, guest: updated });
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
  const guest = await resolveGuest(id, session.user.id);
  if (!guest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await getPrisma().guest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
