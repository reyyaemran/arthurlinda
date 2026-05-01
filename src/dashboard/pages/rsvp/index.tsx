"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { GuestCategory, GuestSide, Rsvp, RsvpStatus } from "@/types/wedding";
import {
  StatusBadge,
  rsvpConfig,
  rsvpGlassClass,
} from "@/components/ui/status-badge";
import { RelationChip } from "@/components/relation-chip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RsvpDetailDialog } from "@/dashboard/pages/rsvp/rsvp-detail-dialog";
import {
  MoreHorizontal,
  Eye,
  User,
  UserCheck,
  UserX,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  ListChecks,
  Users,
  Percent,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { useHeaderSearch } from "@/hooks/use-header-search";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;

const RSVP_MENU_ORDER: RsvpStatus[] = ["CONFIRMED", "DECLINED", "PENDING"];

const colIcon = "h-3 w-3 shrink-0 text-muted-foreground/45";
const microLabelClass =
  "text-[10px] font-medium tracking-[0.26em] uppercase text-muted-foreground [font-family:var(--font-playfair)]";

interface Props {
  filterStatus?: RsvpStatus;
  initialRsvps: Rsvp[];
  groomName?: string;
  brideName?: string;
}

export function RsvpPage({ filterStatus, initialRsvps, groomName, brideName }: Props) {
  const router = useRouter();
  const [rsvps, setRsvps] = useState<Rsvp[]>(initialRsvps);
  const [detailRsvp, setDetailRsvp] = useState<Rsvp | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const { query: search, setPlaceholder, clear: clearSearch, show, hide } = useHeaderSearch();
  const pageSize = DEFAULT_PAGE_SIZE;

  useEffect(() => {
    setRsvps(initialRsvps);
  }, [initialRsvps]);

  const updateAttendance = useCallback(async (id: string, next: RsvpStatus) => {
    let prev: RsvpStatus | undefined;
    setRsvps((rows) => {
      const row = rows.find((r) => r.id === id);
      if (!row || row.attendance === next) return rows;
      prev = row.attendance;
      return rows.map((r) => (r.id === id ? { ...r, attendance: next } : r));
    });
    if (prev === undefined) return;

    // Mirror the change into the open detail dialog so the badge updates live.
    setDetailRsvp((current) =>
      current && current.id === id ? { ...current, attendance: next } : current,
    );

    try {
      const res = await fetch(`/api/rsvp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to update status");
      }
      toast.success("RSVP status updated");
      router.refresh();
    } catch (e) {
      setRsvps((rows) =>
        rows.map((r) => (r.id === id ? { ...r, attendance: prev! } : r)),
      );
      setDetailRsvp((current) =>
        current && current.id === id ? { ...current, attendance: prev! } : current,
      );
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [router]);

  const handleRsvpDeleted = useCallback(
    (id: string) => {
      setRsvps((rows) => rows.filter((r) => r.id !== id));
      setDetailRsvp((current) => (current && current.id === id ? null : current));
      router.refresh();
    },
    [router],
  );

  const updateRelation = useCallback(
    async (
      id: string,
      next: { side: GuestSide | null; category: GuestCategory | null },
    ) => {
      let prev: { side?: GuestSide; category?: GuestCategory } | undefined;
      setRsvps((rows) => {
        const row = rows.find((r) => r.id === id);
        if (!row) return rows;
        prev = { side: row.side, category: row.category };
        return rows.map((r) =>
          r.id === id
            ? {
                ...r,
                side: next.side ?? undefined,
                category: next.category ?? undefined,
              }
            : r,
        );
      });
      if (prev === undefined) return;
      setDetailRsvp((current) =>
        current && current.id === id
          ? {
              ...current,
              side: next.side ?? undefined,
              category: next.category ?? undefined,
            }
          : current,
      );

      try {
        const res = await fetch(`/api/rsvp/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            side: next.side,
            category: next.category,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Failed to update relation");
        }
        router.refresh();
      } catch (e) {
        const fallback = prev!;
        setRsvps((rows) =>
          rows.map((r) =>
            r.id === id
              ? { ...r, side: fallback.side, category: fallback.category }
              : r,
          ),
        );
        setDetailRsvp((current) =>
          current && current.id === id
            ? { ...current, side: fallback.side, category: fallback.category }
            : current,
        );
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [router],
  );

  useEffect(() => {
    show();
    setPlaceholder("Search…");
    return () => hide();
  }, [show, hide, setPlaceholder]);

  useEffect(() => {
    setPageIndex(0);
  }, [search]);

  const confirmed = useMemo(
    () => rsvps.filter((r) => r.attendance === "CONFIRMED"),
    [rsvps],
  );
  const declined = useMemo(
    () => rsvps.filter((r) => r.attendance === "DECLINED"),
    [rsvps],
  );
  const pending = useMemo(
    () => rsvps.filter((r) => r.attendance === "PENDING"),
    [rsvps],
  );

  const total = rsvps.length;
  const responded = confirmed.length + declined.length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  const filteredRows = useMemo(() => {
    let rows = rsvps;
    if (filterStatus) rows = rows.filter((r) => r.attendance === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.includes(q) ||
          r.message?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [rsvps, filterStatus, search]);

  const totalRows = filteredRows.length;
  const pageCount = Math.ceil(totalRows / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [pageIndex, pageSize, filteredRows]);

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  const stats: Array<{
    label: string;
    value: string | number;
    Icon: React.ElementType;
    primary?: boolean;
  }> = [
    { label: "Confirmed", value: confirmed.length, Icon: UserCheck, primary: true },
    { label: "Declined",  value: declined.length,  Icon: UserX },
    { label: "Pending",   value: pending.length,   Icon: Clock },
    { label: "RSVP rate", value: `${responseRate}%`, Icon: Percent },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-2">
        <h1>RSVP</h1>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-px border border-border/70 bg-border/60 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col bg-background px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-2">
              <p className={microLabelClass}>{s.label}</p>
              <s.Icon className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
            </div>
            <p className={cn("mt-3 font-mono text-[1.45rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.65rem]", s.primary && "text-primary")}>
                {s.value}
              </p>
          </div>
        ))}
      </div>

      {/* ── Card list ── */}
      <div className="flex flex-col gap-2">

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search.trim() ? "No results match your search." : "No RSVP responses yet."}
            </p>
            {search.trim() && (
              <button
                onClick={clearSearch}
                className="text-xs text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Column header */}
        {paginated.length > 0 && (
          <div className="hidden items-center px-4 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/70 sm:flex">
            <div className="flex min-w-0 flex-[3] items-center gap-3 pr-3">
              <span className="w-9 shrink-0" />
              <span className="inline-flex items-center gap-1.5">
                <User className={colIcon} aria-hidden />
                Name
              </span>
            </div>
            <div className="hidden min-w-0 flex-[2] items-center gap-1.5 px-3 sm:flex">
              <Phone className={colIcon} aria-hidden />
              Phone
            </div>
            <div className="hidden min-w-0 flex-[2] items-center gap-1.5 px-3 md:flex">
              <MessageSquare className={colIcon} aria-hidden />
              Notes
            </div>
            <div className="hidden min-w-0 flex-[1.5] items-center gap-1.5 px-3 sm:flex">
              <ListChecks className={colIcon} aria-hidden />
              Status
            </div>
            <div className="flex min-w-0 flex-[0.8] items-center justify-center gap-1 px-1">
              <Users className={colIcon} aria-hidden />
              Pax
            </div>
            <div className="w-8 shrink-0" />
          </div>
        )}

        {paginated.map((rsvp) => (
          <div
            key={rsvp.id}
            className="flex items-center rounded-xl border border-border/50 bg-card px-3 py-2.5 shadow-sm transition-all hover:border-border/70 hover:shadow-md sm:px-4 sm:py-3"
          >
            {/* Name */}
            <div className="flex min-w-0 flex-[3] items-center gap-3 pr-3">
              <Avatar className="h-9 w-9 shrink-0 rounded-full border border-border/50">
                <AvatarFallback>
                  {rsvp.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{rsvp.name}</p>
                  {(rsvp.side || rsvp.category) && (
                    <RelationChip
                      side={rsvp.side}
                      category={rsvp.category}
                      groomName={groomName}
                      brideName={brideName}
                    />
                  )}
                </div>
                {rsvp.phone ? (
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground sm:hidden">
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />
                    <span className="truncate">{rsvp.phone}</span>
                  </p>
                ) : null}
                {rsvp.email ? (
                  <p className="mt-0.5 hidden min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground sm:flex">
                    <Mail className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />
                    <span className="truncate">{rsvp.email}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Phone */}
            <div className="hidden min-w-0 flex-[2] border-l border-border/40 px-3 sm:block">
              <div className="flex min-w-0 items-center gap-2">
                <Phone className={colIcon} aria-hidden />
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {rsvp.phone || "—"}
                </p>
              </div>
            </div>

            {/* Notes (optional message from RSVP form) */}
            <div className="hidden min-w-0 flex-[2] border-l border-border/40 px-3 md:block">
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className={colIcon} aria-hidden />
                <p className="min-w-0 truncate text-xs italic text-muted-foreground/60">
                  {rsvp.message?.trim() || "—"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="hidden min-w-0 flex-[1.5] border-l border-border/40 px-3 sm:block">
              <StatusBadge type="rsvp" value={rsvp.attendance} />
            </div>

            {/* Pax */}
            <div className="min-w-0 flex-[0.8] border-l border-border/40 px-1">
              <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums leading-tight",
                    rsvp.attendance === "CONFIRMED" && "text-primary",
                  )}
                >
                  {rsvp.paxCount > 0 ? rsvp.paxCount : "—"}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    rsvp.attendance === "CONFIRMED"
                      ? "font-medium text-primary/70"
                      : "text-muted-foreground",
                  )}
                >
                  pax
                </span>
              </div>
            </div>

            {/* Menu — shared rounded/minimal defaults from dropdown-menu */}
            <div className="flex w-7 shrink-0 flex-col items-end justify-center gap-1 pl-0.5 sm:w-8 sm:pl-1">
              {(() => {
                const cfg = rsvpConfig[rsvp.attendance];
                const glass = rsvpGlassClass[rsvp.attendance];
                const Icon = cfg.icon;
                return (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background sm:hidden"
                    aria-label={cfg.label}
                    title={cfg.label}
                  >
                    <Icon className={cn("h-3 w-3", glass.icon)} strokeWidth={2.5} aria-hidden />
                  </span>
                );
              })()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 touch-manipulation rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground sm:h-8 sm:rounded-lg"
                    aria-label="RSVP actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.25} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[min(100vw-2rem,11rem)] min-w-[10rem] sm:w-52"
                >
                  <DropdownMenuItem className="gap-2" onSelect={() => setDetailRsvp(rsvp)}>
                    <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {RSVP_MENU_ORDER.map((value) => {
                    const cfg = rsvpConfig[value];
                    const glass = rsvpGlassClass[value];
                    const Icon = cfg.icon;
                    const selected = rsvp.attendance === value;
                    return (
                      <DropdownMenuItem
                        key={value}
                        className="gap-2"
                        onSelect={() => void updateAttendance(rsvp.id, value)}
                      >
                        <Icon
                          className={cn("h-3.5 w-3.5 shrink-0", glass.icon)}
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1",
                            selected ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {cfg.label}
                        </span>
                        {selected ? (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-primary"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalRows > 0 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {totalRows} {totalRows === 1 ? "response" : "responses"}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setPageIndex((p) => p - 1)}
                disabled={!canPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[64px] text-center text-xs text-muted-foreground">
                {pageIndex + 1} / {pageCount || 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setPageIndex((p) => p + 1)}
                disabled={!canNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <RsvpDetailDialog
        rsvp={detailRsvp}
        open={!!detailRsvp}
        onOpenChange={(open) => !open && setDetailRsvp(null)}
        onAttendanceChange={updateAttendance}
        onRelationChange={updateRelation}
        onDeleted={handleRsvpDeleted}
        groomName={groomName}
        brideName={brideName}
      />
    </div>
  );
}
