"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  X,
  Mail,
  Phone,
  Users,
  Heart,
  MessageSquare,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { rsvpConfig, rsvpGlassClass } from "@/components/ui/status-badge";
import type { GuestCategory, GuestSide, Rsvp, RsvpStatus } from "@/types/wedding";
import {
  RSVP_SIDES,
  RSVP_CATEGORIES,
  SIDE_LABEL,
  CATEGORY_LABEL,
  formatRelation,
} from "@/lib/wedding/relation";
import { cn } from "@/lib/utils";

type RsvpSide = Extract<GuestSide, "GROOM" | "BRIDE">;
type RsvpCategory = Extract<GuestCategory, "FAMILY" | "RELATIVE" | "FRIEND">;

const RSVP_ACTIONS: RsvpStatus[] = ["CONFIRMED", "PENDING", "DECLINED"];

const microLabelClass =
  "text-[9.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground [font-family:var(--font-playfair)]";

function messageFromApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}

export type RsvpDetailDialogProps = {
  rsvp: Rsvp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist a status change. Should resolve when the API call finishes. */
  onAttendanceChange: (id: string, next: RsvpStatus) => Promise<void> | void;
  /** Called after the row is removed server-side, so the parent can prune state. */
  onDeleted: (id: string) => void;
  /**
   * Persist a relation change (side and/or category). Receiving `null` for
   * either field clears it. Should resolve when the API call finishes.
   */
  onRelationChange: (
    id: string,
    next: { side: GuestSide | null; category: GuestCategory | null },
  ) => Promise<void> | void;
  /** Optional first names for personalising the side picker. */
  groomName?: string;
  brideName?: string;
};

type FieldRowProps = {
  label: string;
  Icon?: React.ElementType;
  children: React.ReactNode;
  span?: 1 | 2;
  className?: string;
};

function FieldRow({ label, Icon, children, span = 1, className }: FieldRowProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lg border border-border/35 bg-background/65 px-3 py-2.5",
        span === 2 && "sm:col-span-2",
        className,
      )}
    >
      <p className={cn("flex items-center gap-1.5", microLabelClass)}>
        {Icon ? <Icon className="h-3 w-3 text-muted-foreground/55" aria-hidden /> : null}
        {label}
      </p>
      <div className="text-[13px] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export function RsvpDetailDialog({
  rsvp,
  open,
  onOpenChange,
  onAttendanceChange,
  onDeleted,
  onRelationChange,
  groomName,
  brideName,
}: RsvpDetailDialogProps) {
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStatusClick = async (next: RsvpStatus) => {
    if (!rsvp || rsvp.attendance === next || pending) return;
    setPending(true);
    try {
      await Promise.resolve(onAttendanceChange(rsvp.id, next));
    } finally {
      setPending(false);
    }
  };

  const handleRelationToggle = async (
    field: "side" | "category",
    value: RsvpSide | RsvpCategory,
  ) => {
    if (!rsvp || pending) return;
    const current = rsvp[field];
    const nextValue = current === value ? null : value;
    const next = {
      side:
        field === "side"
          ? (nextValue as GuestSide | null)
          : (rsvp.side ?? null),
      category:
        field === "category"
          ? (nextValue as GuestCategory | null)
          : (rsvp.category ?? null),
    };
    setPending(true);
    try {
      await Promise.resolve(onRelationChange(rsvp.id, next));
    } finally {
      setPending(false);
    }
  };

  const sideLabelFor = (s: RsvpSide) =>
    s === "GROOM"
      ? groomName?.trim() || SIDE_LABEL.GROOM
      : brideName?.trim() || SIDE_LABEL.BRIDE;

  const handleDelete = async () => {
    if (!rsvp) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rsvp/${rsvp.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(messageFromApiError(data.error, "Failed to delete RSVP"));
      }
      onDeleted(rsvp.id);
      toast.success("RSVP removed");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => !pending && !deleting && onOpenChange(o)}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "gap-0 overflow-hidden rounded-md border-border/70 p-0 sm:max-w-[440px]",
            "shadow-[0_24px_64px_-16px_rgba(30,35,15,0.14)]",
          )}
        >
          {/* Header */}
          <div className="relative border-b border-border/60 bg-muted/20 px-6 pb-4 pt-6 text-center">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={pending || deleting}
              className="absolute right-4 top-4 rounded-sm p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Close"
            >
              <X className="size-[18px]" strokeWidth={2} aria-hidden />
            </button>

            {rsvp ? (
              <>
                <DialogTitle
                  className="border-0 p-0 text-center font-normal text-[1.8rem] leading-[1.08] tracking-tight text-foreground shadow-none sm:text-[2.05rem]"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {rsvp.name}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-[10.5px] text-muted-foreground">
                  Submitted {format(new Date(rsvp.submittedAt), "EEEE d MMMM yyyy 'at' p")}
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle className="sr-only">RSVP details</DialogTitle>
                <DialogDescription className="sr-only">RSVP details</DialogDescription>
              </>
            )}
          </div>

          {/* Body */}
          {rsvp ? (
            <div className="space-y-2.5 px-4 py-3">
              <div className="grid grid-cols-2 gap-2.5">
                <FieldRow label="Email" Icon={Mail}>
                {rsvp.email?.trim() ? (
                  <a
                    href={`mailto:${rsvp.email.trim()}`}
                    className="break-all underline-offset-2 hover:underline"
                  >
                    {rsvp.email.trim()}
                  </a>
                ) : (
                  <span className="text-muted-foreground/65">Not provided</span>
                )}
                </FieldRow>

                <FieldRow label="Phone" Icon={Phone}>
                {rsvp.phone?.trim() ? (
                  <a
                    href={`tel:${rsvp.phone.trim()}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {rsvp.phone.trim()}
                  </a>
                ) : (
                  <span className="text-muted-foreground/65">Not provided</span>
                )}
                </FieldRow>

                <FieldRow label="Guests (pax)" Icon={Users}>
                <span className="font-mono tabular-nums">
                  {rsvp.paxCount > 0 ? rsvp.paxCount : "—"}
                </span>
                </FieldRow>

                <FieldRow label="Relation" Icon={Heart}>
                {(() => {
                  const label = formatRelation(
                    rsvp.side ?? null,
                    rsvp.category ?? null,
                  );
                  if (!label) {
                    return <span className="text-muted-foreground/65">Not set</span>;
                  }
                  // Personalise the side word with first names when available.
                  const side = rsvp.side;
                  if (side && side !== "BOTH" && rsvp.category) {
                    return `${sideLabelFor(side as RsvpSide)}'s ${CATEGORY_LABEL[rsvp.category].toLowerCase()}`;
                  }
                  if (side && side !== "BOTH") {
                    return `${sideLabelFor(side as RsvpSide)}'s side`;
                  }
                  return label;
                })()}
                </FieldRow>
              </div>

              <FieldRow label="Message" Icon={MessageSquare} span={2} className="sm:min-h-[5.4rem]">
                {rsvp.message?.trim() ? (
                  <p className="whitespace-pre-wrap italic text-foreground/85">
                    “{rsvp.message.trim()}”
                  </p>
                ) : (
                  <span className="text-muted-foreground/65">No message</span>
                )}
              </FieldRow>
            </div>
          ) : null}

          {/* Status quick-pick row */}
          {rsvp ? (
            <div className="border-t border-border/50 bg-muted/[0.08] px-4 py-3">
              <p className={cn("mb-2", microLabelClass)}>Status</p>
              <div className="grid grid-cols-3 gap-2">
                {RSVP_ACTIONS.map((value) => {
                  const cfg = rsvpConfig[value];
                  const glass = rsvpGlassClass[value];
                  const Icon = cfg.icon;
                  const selected = rsvp.attendance === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void handleStatusClick(value)}
                      disabled={pending || deleting || selected}
                      aria-pressed={selected}
                      className={cn(
                        "group flex h-8 items-center justify-center gap-1 rounded-full border text-[9.5px] font-normal tracking-[0.03em] transition-colors",
                        selected
                          ? "border-primary bg-primary/8 text-foreground"
                          : "border-border/70 bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                        "disabled:opacity-60",
                        selected && "disabled:opacity-100",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3 w-3 shrink-0",
                          selected ? glass.icon : "text-muted-foreground/65 group-hover:text-foreground/80",
                        )}
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span className="truncate">{cfg.label}</span>
                      {selected ? (
                        <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Relation quick-pick row */}
          {rsvp ? (
            <div className="border-t border-border/50 bg-muted/[0.04] px-4 py-3">
              <p className={cn("mb-2", microLabelClass)}>Relation</p>
              <div className="grid grid-cols-2 gap-2">
                {RSVP_SIDES.map((value) => {
                  const selected = rsvp.side === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void handleRelationToggle("side", value)}
                      disabled={pending || deleting}
                      aria-pressed={selected}
                      className={cn(
                        "group flex h-8 items-center justify-center gap-1 rounded-full border text-[9.5px] font-normal tracking-[0.03em] transition-colors",
                        selected
                          ? "border-primary bg-primary/8 text-foreground"
                          : "border-border/70 bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                      )}
                    >
                      <span className="truncate">{sideLabelFor(value)}</span>
                      {selected ? (
                        <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {RSVP_CATEGORIES.map((value) => {
                  const selected = rsvp.category === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void handleRelationToggle("category", value)}
                      disabled={pending || deleting}
                      aria-pressed={selected}
                      className={cn(
                        "group flex h-8 items-center justify-center gap-1 rounded-full border text-[9.5px] font-normal tracking-[0.03em] transition-colors",
                        selected
                          ? "border-primary bg-primary/8 text-foreground"
                          : "border-border/70 bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                      )}
                    >
                      <span className="truncate">{CATEGORY_LABEL[value]}</span>
                      {selected ? (
                        <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground/60">
                Tap a chip again to clear it.
              </p>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-center border-t border-border/50 bg-background px-4 py-3">
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={pending || deleting || !rsvp}
              className={cn(
                "inline-flex min-w-[9rem] items-center justify-center gap-1.5 rounded-full border border-destructive/45 bg-destructive/[0.04] px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-destructive transition-colors",
                "[font-family:var(--font-playfair)]",
                "hover:border-destructive hover:bg-destructive hover:text-destructive-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3 w-3" aria-hidden />
              )}
              {deleting ? "Removing…" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
