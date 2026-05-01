import type {
  Guest as PrismaGuest,
  Rsvp as PrismaRsvp,
  TimelineTask as PrismaTimelineTask,
  Wedding,
  WeddingEvent,
} from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import { resolveLandingContent } from "@/lib/wedding/landing-content";
import { derivePaymentStatus } from "@/lib/wedding/payment-status";
import { toGuestCategory, toGuestSide } from "@/lib/wedding/relation";
import { SINGLETON_DEPLOYMENT_ID } from "@/lib/wedding/singleton";
import { totalPlanningPaxForGuest } from "@/lib/wedding/guest-pax-stats";
import type {
  BudgetCategory as BudgetCategoryVM,
  Expense as ExpenseVM,
  Guest,
  GuestCategory,
  Invoice,
  PaymentStatus,
  Rsvp,
  RsvpStatus,
  TaskStatus,
  TimelineTask,
  Vendor,
} from "@/types/wedding";

/** The only wedding row for this database (single-tenant). */
export async function getSingletonWedding() {
  return getPrisma().wedding.findUnique({
    where: { deploymentId: SINGLETON_DEPLOYMENT_ID },
  });
}

/** Singleton wedding with schedule — used for public pages and admin. */
export async function getSingletonWeddingWithEvents() {
  return getPrisma().wedding.findUnique({
    where: { deploymentId: SINGLETON_DEPLOYMENT_ID },
    include: {
      events: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/**
 * Public lookup by URL slug — only succeeds for this deployment’s wedding (one tenant).
 */
export async function getWeddingBySlug(slug: string) {
  const w = await getSingletonWeddingWithEvents();
  if (!w || w.slug !== slug.trim()) return null;
  return w;
}

/** Logged-in admin’s wedding — must be linked via WeddingUser to the singleton row. */
export async function getWeddingForUser(userId: string): Promise<Wedding | null> {
  const wedding = await getSingletonWedding();
  if (!wedding) return null;
  const link = await getPrisma().weddingUser.findFirst({
    where: { userId, weddingId: wedding.id },
  });
  return link ? wedding : null;
}

export async function getWeddingWithEventsForUser(userId: string) {
  const w = await getWeddingForUser(userId);
  if (!w) return null;
  return getPrisma().wedding.findUnique({
    where: { id: w.id },
    include: { events: { orderBy: { sortOrder: "asc" } } },
  });
}

export function mapGuest(
  g: PrismaGuest,
  rsvp: { attendance: RsvpStatus; paxCount: number } | null,
): Guest {
  const rsvpStatus = rsvp?.attendance ?? "PENDING";
  const confirmedPax = rsvp?.attendance === "CONFIRMED" ? rsvp.paxCount : 0;
  const hasLinkedRsvp = !!rsvp;
  // Auto-created guests from public RSVP have a notes marker we can detect;
  // see linkOrCreateGuestForRsvp(). Fallback heuristic: created within a few
  // seconds of the RSVP submission. We just expose the marker for now.
  const fromRsvp = (g.notes ?? "").includes("[from-rsvp]");
  return {
    id: g.id,
    weddingId: g.weddingId,
    name: g.name,
    phone: g.phone ?? undefined,
    email: g.email ?? undefined,
    category: g.category as GuestCategory,
    invitedPax: g.invitedPax,
    side: g.side as Guest["side"],
    tableNumber: g.tableNumber ?? undefined,
    // Hide the internal marker from the UI.
    notes: (g.notes ?? "").replace(/\s*\[from-rsvp\]\s*/g, "").trim() || undefined,
    checkedIn: g.checkedIn,
    checkedInAt: g.checkedInAt?.toISOString(),
    rsvpStatus,
    confirmedPax,
    fromRsvp,
    hasLinkedRsvp,
    createdAt: g.createdAt.toISOString(),
  };
}

export async function listGuestsViewModels(weddingId: string): Promise<Guest[]> {
  const [guests, rsvps] = await Promise.all([
    getPrisma().guest.findMany({ where: { weddingId }, orderBy: { createdAt: "desc" } }),
    getPrisma().rsvp.findMany({
      where: { weddingId, guestId: { not: null } },
      select: { guestId: true, attendance: true, paxCount: true },
    }),
  ]);
  const byGuest = new Map(
    rsvps
      .filter((r) => r.guestId)
      .map((r) => [
        r.guestId!,
        { attendance: r.attendance as RsvpStatus, paxCount: r.paxCount },
      ]),
  );
  return guests.map((g) => mapGuest(g, byGuest.get(g.id) ?? null));
}

export function mapRsvp(r: PrismaRsvp): Rsvp {
  return {
    id: r.id,
    weddingId: r.weddingId,
    guestId: r.guestId ?? undefined,
    name: r.name,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    attendance: r.attendance as RsvpStatus,
    paxCount: r.paxCount,
    side: toGuestSide(r.side),
    category: toGuestCategory(r.category),
    message: r.message ?? undefined,
    submittedAt: r.submittedAt.toISOString(),
  };
}

export async function listRsvpsViewModels(weddingId: string): Promise<Rsvp[]> {
  const rows = await getPrisma().rsvp.findMany({
    where: { weddingId },
    orderBy: { submittedAt: "desc" },
  });
  return rows.map(mapRsvp);
}

export async function budgetCategoriesWithSpent(
  weddingId: string,
): Promise<BudgetCategoryVM[]> {
  const categories = await getPrisma().budgetCategory.findMany({
    where: { weddingId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      expenses: true,
    },
  });
  return categories.map((c) => ({
    id: c.id,
    weddingId: c.weddingId,
    name: c.name,
    allocatedAmount: c.allocatedAmount,
    totalSpent: c.expenses.reduce((s, e) => s + e.paidAmount, 0),
    committedAmount: c.expenses.reduce((s, e) => s + e.amount, 0),
    expenseCount: c.expenses.length,
  }));
}

export async function listExpensesViewModels(weddingId: string): Promise<ExpenseVM[]> {
  const rows = await getPrisma().expense.findMany({
    where: { weddingId },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { category: true, vendor: true },
  });
  const now = new Date();
  return rows.map((e) => {
    // Re-derive on read so OVERDUE is always realtime.
    const effectiveStatus = derivePaymentStatus({
      amount: e.amount,
      paidAmount: e.paidAmount,
      dueDate: e.dueDate,
      now,
    });
    return {
      id: e.id,
      weddingId: e.weddingId,
      categoryId: e.categoryId,
      categoryName: e.category.name,
      vendorId: e.vendorId ?? undefined,
      vendorName: e.vendor?.name,
      description: e.description,
      amount: e.amount,
      paidAmount: e.paidAmount,
      paymentStatus: effectiveStatus,
      dueDate: e.dueDate?.toISOString(),
      paidDate: e.paidDate?.toISOString(),
      notes: e.notes ?? undefined,
    };
  });
}

export async function listVendorsViewModels(weddingId: string): Promise<Vendor[]> {
  const rows = await getPrisma().vendor.findMany({
    where: { weddingId },
    orderBy: { name: "asc" },
  });
  return rows.map((v) => ({
    id: v.id,
    weddingId: v.weddingId,
    name: v.name,
    serviceType: v.serviceType,
    contactPerson: v.contactPerson ?? undefined,
    phone: v.phone ?? undefined,
    email: v.email ?? undefined,
    website: v.website ?? undefined,
    contractAmount: v.contractAmount,
    paidAmount: v.paidAmount,
    notes: v.notes ?? undefined,
  }));
}

export async function listInvoicesViewModels(weddingId: string): Promise<Invoice[]> {
  const rows = await getPrisma().invoice.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
    include: { vendor: true },
  });
  return rows.map((inv) => ({
    id: inv.id,
    weddingId: inv.weddingId,
    vendorId: inv.vendorId ?? undefined,
    vendorName: inv.vendor?.name,
    invoiceNumber: inv.invoiceNumber ?? undefined,
    amount: inv.amount,
    dueDate: inv.dueDate?.toISOString(),
    paymentStatus: inv.paymentStatus as PaymentStatus,
    category: inv.category ?? undefined,
    fileUrl: inv.fileUrl ?? undefined,
    fileName: inv.fileName ?? undefined,
    fileType: inv.fileType ?? undefined,
    notes: inv.notes ?? undefined,
    createdAt: inv.createdAt.toISOString(),
  }));
}

export function mapTimelineTask(t: PrismaTimelineTask): TimelineTask {
  return {
    id: t.id,
    weddingId: t.weddingId,
    title: t.title,
    description: t.description ?? undefined,
    category: t.category ?? undefined,
    dueDate: t.dueDate?.toISOString(),
    status: t.status as TaskStatus,
    vendorName: t.vendorName ?? undefined,
    notes: t.notes ?? undefined,
    sortOrder: t.sortOrder,
  };
}

export async function listTimelineTasksViewModels(
  weddingId: string,
): Promise<TimelineTask[]> {
  const rows = await getPrisma().timelineTask.findMany({
    where: { weddingId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapTimelineTask);
}

export type OverviewStats = {
  totalInvitedPax: number;
  confirmedPax: number;
  declinedCount: number;
  declinedPax: number;
  pendingPax: number;
  rsvpRatePercent: number;
  totalBudget: number;
  totalCommitted: number;
  totalSpent: number;
  budgetChart: { name: string; spent: number; remaining: number }[];
  doneTasks: number;
  totalTasks: number;
  openTasks: { id: string; title: string; status: TaskStatus }[];
  recentRsvps: { id: string; name: string; paxCount: number; attendance: RsvpStatus }[];
};

export async function getOverviewStats(weddingId: string): Promise<OverviewStats> {
  const prisma = getPrisma();
  const [guests, rsvps, categories, tasks] = await Promise.all([
    prisma.guest.findMany({ where: { weddingId } }),
    prisma.rsvp.findMany({ where: { weddingId } }),
    prisma.budgetCategory.findMany({
      where: { weddingId },
      include: { expenses: true },
    }),
    prisma.timelineTask.findMany({ where: { weddingId } }),
  ]);

  const guestRsvpLookup = (guestId: string) =>
    rsvps.find((r) => r.guestId === guestId);

  const totalInvitedPax = guests.reduce(
    (s, g) =>
      s +
      totalPlanningPaxForGuest(g.invitedPax, guestRsvpLookup(g.id)),
    0,
  );
  const confirmedRsvps = rsvps.filter((r) => r.attendance === "CONFIRMED");
  const declinedRsvps = rsvps.filter((r) => r.attendance === "DECLINED");
  const confirmedPax = confirmedRsvps.reduce((s, r) => s + r.paxCount, 0);
  const declinedPax = declinedRsvps.reduce((s, r) => s + r.paxCount, 0);
  const pendingPax = guests.reduce((s, g) => {
    const linked = guestRsvpLookup(g.id);
    if (!linked) return s + g.invitedPax;
    if (linked.attendance !== "PENDING") return s;
    return s;
    // RSVP exists but attendance not yet confirmed — headline totals treat as 0
    // pax toward planning; omit from pending slice as well (same rule).
  }, 0);

  const finalizedRsvps = rsvps.filter((r) => r.attendance !== "PENDING");
  const rsvpRatePercent =
    rsvps.length > 0
      ? Math.round((finalizedRsvps.length / rsvps.length) * 100)
      : 0;

  const totalBudget = categories.reduce((s, c) => s + c.allocatedAmount, 0);
  const totalCommitted = categories.reduce(
    (s, c) => s + c.expenses.reduce((t, e) => t + e.amount, 0),
    0,
  );
  const totalSpent = categories.reduce(
    (s, c) => s + c.expenses.reduce((t, e) => t + e.paidAmount, 0),
    0,
  );
  const budgetChart = categories.map((c) => {
    const spent = c.expenses.reduce((t, e) => t + e.paidAmount, 0);
    return {
      name: c.name,
      spent,
      remaining: Math.max(0, c.allocatedAmount - spent),
    };
  });

  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const openTasks = tasks
    .filter((t) => t.status !== "DONE")
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
    }));

  const recentRsvps = [...rsvps]
    .sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    )
    .slice(0, 4)
    .map((r) => ({
      id: r.id,
      name: r.name,
      paxCount: r.paxCount,
      attendance: r.attendance as RsvpStatus,
    }));

  return {
    totalInvitedPax,
    confirmedPax,
    declinedCount: declinedRsvps.length,
    declinedPax,
    pendingPax,
    rsvpRatePercent,
    totalBudget,
    totalCommitted,
    totalSpent,
    budgetChart,
    doneTasks,
    totalTasks: tasks.length,
    openTasks,
    recentRsvps,
  };
}

/** Serialize Prisma wedding + events for invitation templates (ISO strings). */
export function serializeWeddingForPublic(
  wedding: Wedding & { events: WeddingEvent[] },
) {
  return {
    id: wedding.id,
    slug: wedding.slug,
    groomName: wedding.groomName,
    brideName: wedding.brideName,
    groomFullName: wedding.groomFullName ?? undefined,
    brideFullName: wedding.brideFullName ?? undefined,
    groomParents: wedding.groomParents ?? undefined,
    brideParents: wedding.brideParents ?? undefined,
    eventDate: wedding.eventDate.toISOString(),
    venueName: wedding.venueName ?? undefined,
    venueAddress: wedding.venueAddress ?? undefined,
    venueMapUrl: wedding.venueMapUrl ?? undefined,
    quoteText: wedding.quoteText ?? undefined,
    quoteSource: wedding.quoteSource ?? undefined,
    giftInfo: wedding.giftInfo ?? undefined,
    bankName: wedding.bankName ?? undefined,
    bankAccount: wedding.bankAccount ?? undefined,
    bankHolder: wedding.bankHolder ?? undefined,
    currency: wedding.currency,
    timezone: wedding.timezone,
    landing: resolveLandingContent(wedding.landingOverrides),
    events: wedding.events.map((e) => ({
      id: e.id,
      weddingId: e.weddingId,
      title: e.title,
      description: e.description ?? undefined,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime?.toISOString(),
      location: e.location ?? undefined,
      sortOrder: e.sortOrder,
    })),
  };
}

export type PublicWeddingPayload = ReturnType<typeof serializeWeddingForPublic>;
