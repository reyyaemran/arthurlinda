"use client";

import { useMemo, useState } from "react";
import { Clock, Download, Plus, UserCheck, UserX, Users } from "lucide-react";
import { useGuests } from "./hooks/use-guests";
import { GuestsList } from "./components/guests-list";
import { AddGuestDrawer } from "./components/add-guest-drawer";
import { cn } from "@/lib/utils";
import type { Guest } from "@/types/wedding";
import { totalPlanningPaxForGuestVm } from "@/lib/wedding/guest-pax-stats";

const microLabelClass =
  "text-[10px] font-medium tracking-[0.26em] uppercase text-muted-foreground [font-family:var(--font-playfair)]";

export function GuestsPage({
  initialGuests,
  groomName,
  brideName,
}: {
  initialGuests: Guest[];
  groomName?: string;
  brideName?: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);

  const {
    guests,
    allGuests,
    pageCount,
    sorting,
    pagination,
    handleSortingChange,
    handlePaginationChange,
  } = useGuests(initialGuests);

  // Stats are derived from the full list (not the filtered/paginated subset)
  // so the totals stay stable as the user filters/searches.
  const stats = useMemo(() => {
    let confirmed = 0;
    let confirmedPax = 0;
    let pending = 0;
    let declined = 0;
    let effectiveTotalPax = 0;
    let fromRsvp = 0;
    for (const g of initialGuests) {
      effectiveTotalPax += totalPlanningPaxForGuestVm(g);
      if (g.fromRsvp) fromRsvp += 1;
      if (g.rsvpStatus === "CONFIRMED") {
        confirmed += 1;
        confirmedPax += g.confirmedPax;
      } else if (g.rsvpStatus === "DECLINED") declined += 1;
      else pending += 1;
    }
    return {
      total: initialGuests.length,
      confirmed,
      confirmedPax,
      pending,
      declined,
      invitedPax: effectiveTotalPax,
      fromRsvp,
    };
  }, [initialGuests]);

  const guestStats: Array<{
    label: string;
    value: string | number;
    Icon: React.ElementType;
    primary?: boolean;
  }> = [
    {
      label: "Total Pax",
      value: stats.invitedPax,
      Icon: Users,
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      Icon: UserCheck,
      primary: true,
    },
    {
      label: "Pending",
      value: stats.pending,
      Icon: Clock,
    },
    {
      label: "Declined",
      value: stats.declined,
      Icon: UserX,
    },
  ];

  const openAdd = () => {
    setEditGuest(null);
    setDrawerOpen(true);
  };

  const openEdit = (guest: Guest) => {
    setEditGuest(guest);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <h1>Guest list</h1>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <a
            href="/api/export/guests/pdf"
            download
            aria-label="Export guest list PDF"
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary px-0 text-[11px] tracking-[0.2em] uppercase text-primary transition-colors duration-300 hover:text-background sm:w-auto sm:px-5"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
            />
            <span className="relative flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </span>
          </a>
          <button
            type="button"
            onClick={openAdd}
            aria-label="Add guest"
            className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary px-0 text-[11px] tracking-[0.2em] uppercase text-primary transition-colors duration-300 hover:text-background sm:w-auto sm:px-5"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
            />
            <span className="relative flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add guest</span>
            </span>
          </button>
        </div>
      </div>

      <AddGuestDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        guest={editGuest}
      />

      {/* Stats — aligned with RSVP cards. */}
      {initialGuests.length > 0 && (
        <div className="grid grid-cols-2 gap-px border border-border/70 bg-border/60 sm:grid-cols-4">
          {guestStats.map((s) => (
            <div key={s.label} className="flex flex-col bg-background px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-start justify-between gap-2">
                <p className={microLabelClass}>{s.label}</p>
                <s.Icon className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
              </div>
                <p
                  className={cn(
                    "mt-3 font-mono text-[1.45rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.65rem]",
                    s.primary && "text-primary",
                  )}
                >
                  {s.value}
                </p>
            </div>
          ))}
        </div>
      )}

      <GuestsList
        guests={guests}
        totalRows={allGuests.length}
        sorting={sorting}
        onSort={handleSortingChange}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        pageCount={pageCount}
        onEdit={openEdit}
        groomName={groomName}
        brideName={brideName}
      />
    </div>
  );
}
