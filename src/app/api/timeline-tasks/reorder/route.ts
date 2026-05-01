import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const bodySchema = z.object({
  orderedIds: z.array(z.string()).min(1),
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

    const prisma = getPrisma();
    const { orderedIds } = parsed.data;

    const existing = await prisma.timelineTask.findMany({
      where: { weddingId: wedding.id },
      select: { id: true },
    });
    const idSet = new Set(existing.map((r) => r.id));

    if (orderedIds.length !== idSet.size) {
      return NextResponse.json(
        { error: "orderedIds must include every task exactly once" },
        { status: 400 },
      );
    }
    if (!orderedIds.every((id) => idSet.has(id))) {
      return NextResponse.json({ error: "Invalid task id in list" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.timelineTask.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
