import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import type { LandingOverrides } from "@/lib/wedding/landing-content";
import { getWeddingForUser } from "@/lib/wedding/queries";

export const runtime = "nodejs";

const storySlideSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  imageUrl: z
    .string()
    .optional()
    .refine(
      (s) =>
        s === undefined ||
        s.trim() === "" ||
        /^\/uploads\/story\/[^/]+\.(jpe?g|png|webp|gif)$/i.test(s.trim()),
      "Invalid story image path",
    ),
});

const accommodationSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  distance: z.string().min(1),
  bookingUrl: z.union([z.string().url(), z.literal("")]),
});

const landingOverridesSchema = z.object({
  heroEyebrow: z.string().min(1),
  storySectionLabel: z.string().min(1),
  storySlides: z.array(storySlideSchema).min(1, "Add at least one story slide"),
  rsvpHeadline: z.string().min(1),
  rsvpBody: z.string().min(1),
  stayTitle: z.string().min(1),
  staySubtitle: z.string().min(1),
  accommodations: z.array(accommodationSchema).min(1, "Add at least one accommodation"),
});

const scheduleEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Each schedule item needs a title"),
  description: z.string().optional().nullable(),
  startTime: z.string().min(1),
  endTime: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const bodySchema = z.object({
  groomName: z.string().min(1, "Groom name is required"),
  brideName: z.string().min(1, "Bride name is required"),
  groomFullName: z.string().optional(),
  brideFullName: z.string().optional(),
  groomParents: z.string().optional(),
  brideParents: z.string().optional(),
  eventDate: z.string().min(1, "Event date is required"),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  venueMapUrl: z.string().url().optional().or(z.literal("")),
  quoteText: z.string().optional(),
  quoteSource: z.string().optional(),
  giftInfo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankHolder: z.string().optional(),
  currency: z.string().length(3, "Use a 3-letter currency code (e.g. USD)").optional(),
  timezone: z.string().min(1).optional(),
  landingOverrides: landingOverridesSchema.optional(),
  /** Landing “When” timeline — replaces list when sent (omit to leave unchanged). */
  scheduleEvents: z.array(scheduleEventSchema).optional(),
});

export async function PATCH(req: Request) {
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

    const {
      groomName, brideName, groomFullName, brideFullName,
      groomParents, brideParents, eventDate, slug,
      venueName, venueAddress, venueMapUrl,
      quoteText, quoteSource, giftInfo,
      bankName, bankAccount, bankHolder,
      currency, timezone, landingOverrides, scheduleEvents,
    } = parsed.data;

    const landingJson: LandingOverrides | undefined = landingOverrides
      ? {
          ...landingOverrides,
          storySlides: landingOverrides.storySlides.map((s) => ({
            title: s.title,
            text: s.text,
            ...(s.imageUrl?.trim() ? { imageUrl: s.imageUrl.trim() } : {}),
          })),
          accommodations: landingOverrides.accommodations.map((a) => ({
            ...a,
            bookingUrl: a.bookingUrl.trim(),
          })),
        }
      : undefined;

    if (scheduleEvents !== undefined) {
      for (const ev of scheduleEvents) {
        if (Number.isNaN(new Date(ev.startTime).getTime())) {
          return NextResponse.json(
            { error: "Invalid start time on a schedule item" },
            { status: 400 },
          );
        }
        if (ev.endTime?.trim()) {
          if (Number.isNaN(new Date(ev.endTime).getTime())) {
            return NextResponse.json(
              { error: "Invalid end time on a schedule item" },
              { status: 400 },
            );
          }
        }
      }
    }

    const prisma = getPrisma();
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.wedding.update({
        where: { id: wedding.id },
        data: {
          groomName: groomName.trim(),
          brideName: brideName.trim(),
          groomFullName: groomFullName?.trim() || null,
          brideFullName: brideFullName?.trim() || null,
          groomParents: groomParents?.trim() || null,
          brideParents: brideParents?.trim() || null,
          eventDate: new Date(eventDate),
          slug: slug.trim(),
          venueName: venueName?.trim() || null,
          venueAddress: venueAddress?.trim() || null,
          venueMapUrl: venueMapUrl?.trim() || null,
          quoteText: quoteText?.trim() || null,
          quoteSource: quoteSource?.trim() || null,
          giftInfo: giftInfo?.trim() || null,
          bankName: bankName?.trim() || null,
          bankAccount: bankAccount?.trim() || null,
          bankHolder: bankHolder?.trim() || null,
          ...(currency != null ? { currency: currency.trim().toUpperCase() } : {}),
          ...(timezone != null ? { timezone: timezone.trim() } : {}),
          ...(landingJson != null ? { landingOverrides: landingJson as object } : {}),
        },
      });

      if (scheduleEvents !== undefined) {
        const existing = await tx.weddingEvent.findMany({
          where: { weddingId: wedding.id },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((r) => r.id));
        const keepIds = new Set(
          scheduleEvents.map((e) => e.id).filter((id): id is string => Boolean(id)),
        );
        const remove = [...existingIds].filter((id) => !keepIds.has(id));
        if (remove.length > 0) {
          await tx.weddingEvent.deleteMany({
            where: { weddingId: wedding.id, id: { in: remove } },
          });
        }

        for (let i = 0; i < scheduleEvents.length; i++) {
          const ev = scheduleEvents[i]!;
          const sortOrder = ev.sortOrder ?? i;
          const startTime = new Date(ev.startTime);
          const endTime =
            ev.endTime && ev.endTime.trim() !== "" ? new Date(ev.endTime) : null;

          if (ev.id && existingIds.has(ev.id)) {
            await tx.weddingEvent.update({
              where: { id: ev.id },
              data: {
                title: ev.title.trim(),
                description: ev.description?.trim() || null,
                startTime,
                endTime,
                location: ev.location?.trim() || null,
                sortOrder,
              },
            });
          } else {
            await tx.weddingEvent.create({
              data: {
                weddingId: wedding.id,
                title: ev.title.trim(),
                description: ev.description?.trim() || null,
                startTime,
                endTime,
                location: ev.location?.trim() || null,
                sortOrder,
              },
            });
          }
        }
      }

      return row;
    });

    return NextResponse.json({ ok: true, slug: updated.slug });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
