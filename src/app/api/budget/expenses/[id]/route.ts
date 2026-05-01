import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { derivePaymentStatus } from "@/lib/wedding/payment-status";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const optStr = z.union([z.string(), z.null()]).optional();

const patchSchema = z
  .object({
    description: z.string().min(1).max(200).optional(),
    categoryId: z.string().min(1).optional(),
    vendorId: optStr,
    amount: z.coerce.number().min(0).optional(),
    paidAmount: z.coerce.number().min(0).optional(),
    dueDate: optStr,
    notes: optStr,
  })
  .superRefine((data, ctx) => {
    const keys = [
      "description",
      "categoryId",
      "vendorId",
      "amount",
      "paidAmount",
      "dueDate",
      "notes",
    ] as const;
    if (!keys.some((k) => data[k] !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
        path: [],
      });
    }
  });

function parseDate(raw: string | null | undefined): Date | null {
  if (raw === undefined || raw === null) return null;
  const t = raw.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normStr(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

async function resolveExpense(expenseId: string, userId: string) {
  const wedding = await getWeddingForUser(userId);
  if (!wedding) return null;
  const e = await getPrisma().expense.findUnique({ where: { id: expenseId } });
  if (!e || e.weddingId !== wedding.id) return null;
  return { wedding, expense: e };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const resolved = await resolveExpense(id, session.user.id);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { wedding, expense } = resolved;

  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Validate category if changed.
    if (parsed.data.categoryId && parsed.data.categoryId !== expense.categoryId) {
      const cat = await prisma.budgetCategory.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!cat || cat.weddingId !== wedding.id) {
        return NextResponse.json(
          { error: { categoryId: ["Category not found"] } },
          { status: 400 },
        );
      }
    }

    // Validate vendor if provided.
    if (parsed.data.vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: parsed.data.vendorId },
      });
      if (!vendor || vendor.weddingId !== wedding.id) {
        return NextResponse.json(
          { error: { vendorId: ["Vendor not found"] } },
          { status: 400 },
        );
      }
    }

    const nextAmount =
      parsed.data.amount !== undefined ? parsed.data.amount : expense.amount;
    const nextPaid =
      parsed.data.paidAmount !== undefined ? parsed.data.paidAmount : expense.paidAmount;
    if (nextPaid > nextAmount) {
      return NextResponse.json(
        { error: { paidAmount: ["Paid cannot exceed amount"] } },
        { status: 400 },
      );
    }
    const nextDueDate =
      parsed.data.dueDate !== undefined ? parseDate(parsed.data.dueDate) : expense.dueDate;
    const nextStatus = derivePaymentStatus({
      amount: nextAmount,
      paidAmount: nextPaid,
      dueDate: nextDueDate,
    });
    // Stamp paidDate only on the *transition* into PAID, and clear it when
    // the expense is no longer fully paid.
    let nextPaidDate: Date | null | undefined;
    if (nextStatus === "PAID" && expense.paymentStatus !== "PAID") {
      nextPaidDate = new Date();
    } else if (nextStatus !== "PAID" && expense.paidDate) {
      nextPaidDate = null;
    } else {
      nextPaidDate = expense.paidDate;
    }

    const data: Record<string, unknown> = {
      paymentStatus: nextStatus,
      paidDate: nextPaidDate,
    };
    if (parsed.data.description !== undefined) data.description = parsed.data.description.trim();
    if (parsed.data.categoryId !== undefined) data.categoryId = parsed.data.categoryId;
    if (parsed.data.vendorId !== undefined)
      data.vendorId = parsed.data.vendorId === null ? null : parsed.data.vendorId || null;
    if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
    if (parsed.data.paidAmount !== undefined) data.paidAmount = parsed.data.paidAmount;
    if (parsed.data.dueDate !== undefined) data.dueDate = nextDueDate;
    if (parsed.data.notes !== undefined) {
      const v = normStr(parsed.data.notes);
      if (v !== undefined) data.notes = v;
    }

    const row = await prisma.expense.update({
      where: { id },
      data,
      include: { category: true, vendor: true },
    });

    return NextResponse.json({
      ok: true,
      expense: {
        id: row.id,
        weddingId: row.weddingId,
        categoryId: row.categoryId,
        categoryName: row.category.name,
        vendorId: row.vendorId ?? undefined,
        vendorName: row.vendor?.name,
        description: row.description,
        amount: row.amount,
        paidAmount: row.paidAmount,
        paymentStatus: row.paymentStatus,
        dueDate: row.dueDate?.toISOString(),
        paidDate: row.paidDate?.toISOString(),
        notes: row.notes ?? undefined,
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
  const resolved = await resolveExpense(id, session.user.id);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await getPrisma().expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
