import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
    allocatedAmount: z.coerce.number().min(0, "Cannot be negative").optional(),
  })
  .refine((d) => d.name !== undefined || d.allocatedAmount !== undefined, {
    message: "At least one field is required",
  });

async function resolveCategory(categoryId: string, userId: string) {
  const wedding = await getWeddingForUser(userId);
  if (!wedding) return null;
  const cat = await getPrisma().budgetCategory.findUnique({ where: { id: categoryId } });
  if (!cat || cat.weddingId !== wedding.id) return null;
  return cat;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cat = await resolveCategory(id, session.user.id);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data: { name?: string; allocatedAmount?: number } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.allocatedAmount !== undefined)
      data.allocatedAmount = parsed.data.allocatedAmount;

    const prisma = getPrisma();
    const [updated, expenses] = await Promise.all([
      prisma.budgetCategory.update({ where: { id }, data }),
      prisma.expense.findMany({ where: { categoryId: id } }),
    ]);

    const totalSpent = expenses.reduce((s, e) => s + e.paidAmount, 0);
    const committedAmount = expenses.reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      ok: true,
      category: {
        id: updated.id,
        weddingId: updated.weddingId,
        name: updated.name,
        allocatedAmount: updated.allocatedAmount,
        totalSpent,
        committedAmount,
        expenseCount: expenses.length,
      },
    });
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
  const cat = await resolveCategory(id, session.user.id);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Cascade-deletes expenses (see schema). Return how many were removed so the
    // client can refresh local state without a full reload.
    const prisma = getPrisma();
    const removed = await prisma.expense.findMany({
      where: { categoryId: id },
      select: { id: true },
    });
    await prisma.budgetCategory.delete({ where: { id } });
    return NextResponse.json({
      ok: true,
      deletedExpenseIds: removed.map((r) => r.id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
