import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser, mapTimelineTask } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const optionalStr = z.union([z.string(), z.null()]).optional();

const patchSchema = z
  .object({
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    title: z.string().min(1).optional(),
    description: optionalStr,
    category: optionalStr,
    vendorName: optionalStr,
    notes: optionalStr,
    dueDate: z.union([z.string(), z.null()]).optional(),
  })
  .superRefine((data, ctx) => {
    const keys = [
      "status",
      "title",
      "description",
      "category",
      "vendorName",
      "notes",
      "dueDate",
    ] as const;
    if (!keys.some((k) => data[k] !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
        path: [],
      });
    }
  });

function normStr(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

async function resolveTask(taskId: string, userId: string) {
  const wedding = await getWeddingForUser(userId);
  if (!wedding) return null;
  const task = await getPrisma().timelineTask.findUnique({ where: { id: taskId } });
  if (!task || task.weddingId !== wedding.id) return null;
  return task;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await resolveTask(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const p = parsed.data;
    const data: {
      status?: "TODO" | "IN_PROGRESS" | "DONE";
      title?: string;
      description?: string | null;
      category?: string | null;
      vendorName?: string | null;
      notes?: string | null;
      dueDate?: Date | null;
    } = {};

    if (p.status !== undefined) data.status = p.status;
    if (p.title !== undefined) data.title = p.title.trim();
    if (p.description !== undefined) data.description = normStr(p.description) ?? null;
    if (p.category !== undefined) data.category = normStr(p.category) ?? null;
    if (p.vendorName !== undefined) data.vendorName = normStr(p.vendorName) ?? null;
    if (p.notes !== undefined) data.notes = normStr(p.notes) ?? null;
    if (p.dueDate !== undefined) {
      if (p.dueDate === null) {
        data.dueDate = null;
      } else {
        const d = new Date(p.dueDate);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
        }
        data.dueDate = d;
      }
    }

    const row = await getPrisma().timelineTask.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, task: mapTimelineTask(row) });
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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await resolveTask(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await getPrisma().timelineTask.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
