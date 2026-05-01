import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { derivePaymentStatus } from "@/lib/wedding/payment-status";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const createSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  categoryId: z.string().min(1, "Pick a category"),
  vendorId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  paidAmount: z.coerce.number().min(0).default(0),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function parseDate(raw: string | null | undefined): Date | null {
  if (raw === undefined || raw === null) return null;
  const t = raw.trim();
  if (t === "") return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normStr(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

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
    const d = parsed.data;
    if (d.paidAmount > d.amount) {
      return NextResponse.json(
        { error: { paidAmount: ["Paid cannot exceed amount"] } },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    // Verify the category belongs to this wedding to prevent cross-tenant writes.
    const cat = await prisma.budgetCategory.findUnique({ where: { id: d.categoryId } });
    if (!cat || cat.weddingId !== wedding.id) {
      return NextResponse.json(
        { error: { categoryId: ["Category not found"] } },
        { status: 400 },
      );
    }

    if (d.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: d.vendorId } });
      if (!vendor || vendor.weddingId !== wedding.id) {
        return NextResponse.json(
          { error: { vendorId: ["Vendor not found"] } },
          { status: 400 },
        );
      }
    }

    const dueDate = parseDate(d.dueDate);
    const paymentStatus = derivePaymentStatus({
      amount: d.amount,
      paidAmount: d.paidAmount,
      dueDate,
    });
    const paidDate = paymentStatus === "PAID" ? new Date() : null;

    const row = await prisma.expense.create({
      data: {
        weddingId: wedding.id,
        categoryId: d.categoryId,
        vendorId: d.vendorId || null,
        description: d.description.trim(),
        amount: d.amount,
        paidAmount: d.paidAmount,
        paymentStatus,
        dueDate,
        paidDate,
        notes: normStr(d.notes),
      },
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
