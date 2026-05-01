"use client";

import * as React from "react";
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import {
  UserX,
  User,
  Phone,
  MessageSquare,
  ListChecks,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  StatusBadge,
  rsvpConfig,
  rsvpGlassClass,
} from "@/components/ui/status-badge";
import { RelationChip } from "@/components/relation-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Guest } from "@/types/wedding";

const colIcon = "h-3 w-3 shrink-0 text-muted-foreground/45";

interface GuestsListProps {
  guests: Guest[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  onEdit: (guest: Guest) => void;
  groomName?: string;
  brideName?: string;
}

export function GuestsList({
  guests,
  totalRows,
  pagination,
  onPaginationChange,
  pageCount,
  onEdit,
  groomName,
  brideName,
}: GuestsListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<Guest | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const canPrev = pagination.pageIndex > 0;
  const canNext = pagination.pageIndex < pageCount - 1;
  const goTo = (index: number) =>
    onPaginationChange({ ...pagination, pageIndex: index });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guests/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete guest");
        return;
      }
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">

        {/* Empty state */}
        {guests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <UserX className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No guests yet</p>
          </div>
        )}

        {/* Column header */}
        {guests.length > 0 && (
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

        {/* Cards */}
        {guests.map((guest) => (
          <div
            key={guest.id}
            className="flex items-center rounded-xl border border-border/50 bg-card px-3 py-2.5 shadow-sm transition-all hover:border-border/70 hover:shadow-md sm:px-4 sm:py-3"
          >
            {/* Name */}
            <div className="flex min-w-0 flex-[3] items-center gap-3 pr-3">
              <Avatar className="h-9 w-9 shrink-0 rounded-full border border-border/50">
                <AvatarFallback>
                  {guest.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm font-semibold">{guest.name}</p>
                  {(guest.side || guest.category) && (
                    <RelationChip
                      side={guest.side}
                      category={guest.category}
                      groomName={groomName}
                      brideName={brideName}
                    />
                  )}
                </div>
                {guest.phone ? (
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground sm:hidden">
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />
                    <span className="truncate">{guest.phone}</span>
                  </p>
                ) : null}
                {guest.email ? (
                  <p className="mt-0.5 hidden min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground sm:flex">
                    <Mail className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />
                    <span className="truncate">{guest.email}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Phone */}
            <div className="hidden min-w-0 flex-[2] border-l border-border/40 px-3 sm:block">
              <div className="flex min-w-0 items-center gap-2">
                <Phone className={colIcon} aria-hidden />
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {guest.phone || "—"}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="hidden min-w-0 flex-[2] border-l border-border/40 px-3 md:block">
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className={colIcon} aria-hidden />
                <p className="min-w-0 truncate text-xs italic text-muted-foreground/60">
                  {guest.notes?.trim() || "—"}
                </p>
              </div>
            </div>

            {/* Status — RSVP attendance on guest VM */}
            <div className="hidden min-w-0 flex-[1.5] border-l border-border/40 px-3 sm:block">
              <StatusBadge type="rsvp" value={guest.rsvpStatus} />
            </div>

            {/* Pax */}
            <div className="min-w-0 flex-[0.8] border-l border-border/40 px-1">
              <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums leading-tight",
                    guest.rsvpStatus === "CONFIRMED" && "text-primary",
                  )}
                >
                  {(() => {
                    const n =
                      guest.rsvpStatus === "CONFIRMED"
                        ? guest.confirmedPax
                        : guest.invitedPax;
                    return n > 0 ? n : "—";
                  })()}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    guest.rsvpStatus === "CONFIRMED"
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
                const cfg = rsvpConfig[guest.rsvpStatus];
                const glass = rsvpGlassClass[guest.rsvpStatus];
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
                    aria-label="Guest actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.25} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[min(100vw-2rem,11rem)] min-w-[10rem] sm:w-52"
                >
                  <DropdownMenuItem
                    className="gap-2"
                    onClick={() => onEdit(guest)}
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(guest)}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalRows > 0 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {totalRows} {totalRows === 1 ? "guest" : "guests"}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => goTo(pagination.pageIndex - 1)}
                disabled={!canPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[64px] text-center text-xs text-muted-foreground">
                {pagination.pageIndex + 1} / {pageCount || 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => goTo(pagination.pageIndex + 1)}
                disabled={!canNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove guest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>{" "}
              from the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
