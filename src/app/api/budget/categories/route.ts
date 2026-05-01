import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  allocatedAmount: z.coerce.number().min(0, "Cannot be negative").default(0),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wedding = await getWeddingForUser(session.user.id);
  if (!wedding) return NextResponse.json({ error: "Wedding not found" }, { status: 404 });

  try {
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const agg = await prisma.budgetCategory.aggregate({
      where: { weddingId: wedding.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    const category = await prisma.budgetCategory.create({
      data: {
        weddingId: wedding.id,
        name: parsed.data.name.trim(),
        allocatedAmount: parsed.data.allocatedAmount,
        sortOrder,
      },
    });

    return NextResponse.json({
      ok: true,
      category: {
        id: category.id,
        weddingId: category.weddingId,
        name: category.name,
        allocatedAmount: category.allocatedAmount,
        totalSpent: 0,
        committedAmount: 0,
        expenseCount: 0,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
