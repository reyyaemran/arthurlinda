import type { Prisma } from "@prisma/client";
import { WeddingRole } from "@prisma/client";

import { SINGLETON_DEPLOYMENT_ID } from "@/lib/wedding/singleton";
import { resolveLandingContent } from "@/lib/wedding/landing-content";
import type { PublicWeddingPayload } from "@/lib/wedding/queries";

/** Public landing + default API; must match NEXT_PUBLIC_WEDDING_SLUG when set. */
export function getDefaultWeddingSlug(): string {
  return process.env.DEFAULT_WEDDING_SLUG ?? process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "arthur-linda";
}

/**
 * Static fallback payload for the public landing page when the DB has no
 * wedding row yet (first run before the admin is created via CLI).
 */
export function getDefaultPublicWedding(): PublicWeddingPayload {
  const slug = getDefaultWeddingSlug();
  return {
    id: "default",
    slug,
    groomName: "Arthur",
    brideName: "Linda",
    groomFullName: "Arthur",
    brideFullName: "Linda",
    groomParents: "Arthur's parents",
    brideParents: "Linda's parents",
    eventDate: "2026-11-07T03:00:00.000Z",
    venueName: "Angkor Grace",
    venueAddress: "Siem Reap, Cambodia — indoor & outdoor celebration",
    venueMapUrl: "https://maps.google.com/?q=Angkor+Grace+Siem+Reap",
    quoteText:
      "Like branches from the same tree — rooted, reaching, and woven together. We invite you into our cozy, earthy celebration among greens, soft light, and the people we love.",
    quoteSource: "Arthur & Linda",
    giftInfo:
      "Your presence is our greatest gift. Love-stone magnets and small keepsakes will be at your place setting — a little piece of our day to take home.",
    bankName: undefined,
    bankAccount: undefined,
    bankHolder: undefined,
    currency: "USD",
    timezone: "Asia/Phnom_Penh",
    landing: resolveLandingContent(null),
    events: [
      {
        id: "e1",
        weddingId: "default",
        title: "Travel to Siem Reap",
        description: "Arrive and settle in — one week away from routine",
        startTime: "2026-11-05T07:00:00.000Z",
        endTime: "2026-11-05T13:00:00.000Z",
        location: "Siem Reap",
        sortOrder: 0,
      },
      {
        id: "e2",
        weddingId: "default",
        title: "Monk blessing",
        description: "Buddhist temple blessing",
        startTime: "2026-11-06T02:00:00.000Z",
        endTime: "2026-11-06T04:00:00.000Z",
        location: "Buddhist temple",
        sortOrder: 1,
      },
      {
        id: "e3",
        weddingId: "default",
        title: "Angkor Wat reservoir",
        description: "Photos & quiet moments by the water",
        startTime: "2026-11-06T09:00:00.000Z",
        endTime: "2026-11-06T11:30:00.000Z",
        location: "Angkor Wat water reservoir",
        sortOrder: 2,
      },
      {
        id: "e4",
        weddingId: "default",
        title: "Morning ceremony",
        description: "Vows & rings with family",
        startTime: "2026-11-07T03:00:00.000Z",
        endTime: "2026-11-07T05:00:00.000Z",
        location: "Angkor Grace",
        sortOrder: 3,
      },
      {
        id: "e5",
        weddingId: "default",
        title: "Reception party",
        description: "Speeches, dinner, dancing — late afternoon to evening",
        startTime: "2026-11-07T09:00:00.000Z",
        endTime: "2026-11-07T15:00:00.000Z",
        location: "Angkor Grace",
        sortOrder: 4,
      },
    ],
  };
}

/**
 * Creates the initial wedding row + schedule + starter budget/tasks for the first admin.
 */
export function buildDefaultWeddingCreate(userId: string): Prisma.WeddingCreateInput {
  const slug = getDefaultWeddingSlug();

  const events: Prisma.WeddingEventCreateWithoutWeddingInput[] = [
    {
      title: "Travel to Siem Reap",
      description: "Arrive and settle in — one week away from routine",
      startTime: new Date("2026-11-05T07:00:00.000Z"),
      endTime: new Date("2026-11-05T13:00:00.000Z"),
      location: "Siem Reap",
      sortOrder: 0,
    },
    {
      title: "Monk blessing",
      description: "Buddhist temple blessing",
      startTime: new Date("2026-11-06T02:00:00.000Z"),
      endTime: new Date("2026-11-06T04:00:00.000Z"),
      location: "Buddhist temple",
      sortOrder: 1,
    },
    {
      title: "Angkor Wat reservoir",
      description: "Photos & quiet moments by the water",
      startTime: new Date("2026-11-06T09:00:00.000Z"),
      endTime: new Date("2026-11-06T11:30:00.000Z"),
      location: "Angkor Wat water reservoir",
      sortOrder: 2,
    },
    {
      title: "Morning ceremony",
      description: "Vows & rings with family",
      startTime: new Date("2026-11-07T03:00:00.000Z"),
      endTime: new Date("2026-11-07T05:00:00.000Z"),
      location: "Angkor Grace",
      sortOrder: 3,
    },
    {
      title: "Reception party",
      description: "Speeches, dinner, dancing — late afternoon to evening",
      startTime: new Date("2026-11-07T09:00:00.000Z"),
      endTime: new Date("2026-11-07T15:00:00.000Z"),
      location: "Angkor Grace",
      sortOrder: 4,
    },
  ];

  const budgetCategories: Prisma.BudgetCategoryCreateWithoutWeddingInput[] = [
    { name: "Venue & F&B", allocatedAmount: 3500, sortOrder: 0 },
    { name: "Decorations", allocatedAmount: 650, sortOrder: 1 },
    { name: "Attire", allocatedAmount: 300, sortOrder: 2 },
    { name: "Hair & makeup", allocatedAmount: 200, sortOrder: 3 },
    { name: "DJ & photographer", allocatedAmount: 700, sortOrder: 4 },
    { name: "Favours & extras", allocatedAmount: 400, sortOrder: 5 },
    { name: "Beverages", allocatedAmount: 1300, sortOrder: 6 },
    { name: "Contingency", allocatedAmount: 500, sortOrder: 7 },
  ];

  const timelineTasks: Prisma.TimelineTaskCreateWithoutWeddingInput[] = [
    {
      title: "Confirm venue booking",
      category: "Venue",
      dueDate: new Date("2026-08-01T00:00:00.000Z"),
      status: "DONE",
      vendorName: "Angkor Grace",
      sortOrder: 0,
    },
    {
      title: "Monk blessing & temple logistics",
      category: "Ceremony",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      status: "IN_PROGRESS",
      sortOrder: 1,
    },
    {
      title: "Finalize decor (greens & drapery)",
      category: "Decoration",
      dueDate: new Date("2026-10-01T00:00:00.000Z"),
      status: "IN_PROGRESS",
      sortOrder: 2,
    },
    {
      title: "Book DJ & photographer",
      category: "Entertainment",
      dueDate: new Date("2026-09-15T00:00:00.000Z"),
      status: "IN_PROGRESS",
      sortOrder: 3,
    },
    {
      title: "Order cake",
      category: "Catering",
      dueDate: new Date("2026-10-15T00:00:00.000Z"),
      status: "TODO",
      sortOrder: 4,
    },
  ];

  return {
    deploymentId: SINGLETON_DEPLOYMENT_ID,
    slug,
    groomName: "Arthur",
    brideName: "Linda",
    groomFullName: "Arthur",
    brideFullName: "Linda",
    groomParents: "Arthur's parents",
    brideParents: "Linda's parents",
    eventDate: new Date("2026-11-07T03:00:00.000Z"),
    venueName: "Angkor Grace",
    venueAddress: "Siem Reap, Cambodia — indoor & outdoor celebration",
    venueMapUrl: "https://maps.google.com/?q=Angkor+Grace+Siem+Reap",
    quoteText:
      "Like branches from the same tree — rooted, reaching, and woven together. We invite you into our cozy, earthy celebration among greens, soft light, and the people we love.",
    quoteSource: "Arthur & Linda",
    giftInfo:
      "Your presence is our greatest gift. Love-stone magnets and small keepsakes will be at your place setting — a little piece of our day to take home.",
    currency: "USD",
    timezone: "Asia/Phnom_Penh",
    users: {
      create: {
        userId,
        role: WeddingRole.ADMIN,
      },
    },
    events: { create: events },
    budgetCategories: { create: budgetCategories },
    timelineTasks: { create: timelineTasks },
  };
}
