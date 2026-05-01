"use client";

import { useState } from "react";
import { Users, MailCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { GuestsPage } from "@/dashboard/pages/guests";
import { RsvpPage } from "@/dashboard/pages/rsvp";
import type { Guest, Rsvp, RsvpStatus } from "@/types/wedding";

type GuestRsvpPageProps = {
  initialGuests: Guest[];
  initialRsvps: Rsvp[];
  defaultTab?: "guests" | "rsvp";
  filterStatus?: RsvpStatus;
  groomName?: string;
  brideName?: string;
};

export function GuestRsvpPage({
  initialGuests,
  initialRsvps,
  defaultTab = "guests",
  filterStatus,
  groomName,
  brideName,
}: GuestRsvpPageProps) {
  const [activeTab, setActiveTab] = useState<"guests" | "rsvp">(defaultTab);

  const tabClass =
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[10.5px] uppercase tracking-[0.2em] transition-colors [font-family:var(--font-playfair)]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("guests")}
          className={cn(
            tabClass,
            activeTab === "guests"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
          aria-pressed={activeTab === "guests"}
        >
          <Users className="h-3.5 w-3.5" />
          Guests
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rsvp")}
          className={cn(
            tabClass,
            activeTab === "rsvp"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
          aria-pressed={activeTab === "rsvp"}
        >
          <MailCheck className="h-3.5 w-3.5" />
          RSVP
        </button>
      </div>

      {activeTab === "guests" ? (
        <GuestsPage
          initialGuests={initialGuests}
          groomName={groomName}
          brideName={brideName}
        />
      ) : (
        <RsvpPage
          initialRsvps={initialRsvps}
          filterStatus={filterStatus}
          groomName={groomName}
          brideName={brideName}
        />
      )}
    </div>
  );
}

