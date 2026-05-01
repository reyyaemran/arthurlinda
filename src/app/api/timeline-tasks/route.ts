import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { getWeddingForUser, mapTimelineTask } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

function optTrim(s: string | undefined): string | null {
  if (s === undefined) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

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
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const agg = await prisma.timelineTask.aggregate({
      where: { weddingId: wedding.id },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    const d = parsed.data;
    let dueDate: Date | null = null;
    if (d.dueDate && d.dueDate.trim() !== "") {
      const dt = new Date(d.dueDate);
      if (Number.isNaN(dt.getTime())) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
      dueDate = dt;
    }

    const row = await prisma.timelineTask.create({
      data: {
        weddingId: wedding.id,
        title: d.title.trim(),
        description: optTrim(d.description),
        category: optTrim(d.category),
        vendorName: optTrim(d.vendorName),
        notes: optTrim(d.notes),
        dueDate,
        sortOrder,
      },
    });

    return NextResponse.json({ ok: true, task: mapTimelineTask(row) });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
