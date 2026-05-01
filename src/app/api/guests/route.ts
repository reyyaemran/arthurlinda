import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  category: z
    .enum(["FAMILY", "RELATIVE", "FRIEND", "VIP", "COLLEAGUE", "OTHER"])
    .default("FRIEND"),
  side: z.enum(["GROOM", "BRIDE", "BOTH"]).default("BOTH"),
  invitedPax: z.coerce.number().int().min(1).default(1),
  tableNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
  }

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, phone, email, category, side, invitedPax, tableNumber, notes } =
      parsed.data;

    const guest = await getPrisma().guest.create({
      data: {
        weddingId: wedding.id,
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

    return NextResponse.json({ ok: true, guest });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
