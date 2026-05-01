import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().max(40).optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { name, email, phone } = parsed.data;

    const db = getPrisma();
    const existing = await db.user.findFirst({
      where: { email: email.trim().toLowerCase(), NOT: { id: session.user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "That email is already in use." },
        { status: 409 },
      );
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        ...(phone !== undefined ? { phone: phone.trim() ? phone.trim() : null } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
