"use client";

import { useMemo } from "react";
import type { Guest, GuestCategory, RsvpStatus } from "@/types/wedding";
import { StatusBadge } from "@/components/ui/status-badge";
import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCircle } from "lucide-react";

export function useGuestColumns() {
  return useMemo<ColumnDef<Guest>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 rounded-full border border-border">
              <AvatarFallback>
                {row.original.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.getValue("name")}</p>
              {row.original.email && (
                <p className="text-muted-foreground truncate text-xs">{row.original.email}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Contact",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-foreground">{row.getValue("phone") || "—"}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          const cat = row.getValue("category") as GuestCategory;
          return (
            <StatusBadge type="category" value={cat} className="text-xs" />
          );
        },
      },
      {
        accessorKey: "invitedPax",
        header: "Pax",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">{row.getValue("invitedPax")}</span>
        ),
      },
      {
        accessorKey: "rsvpStatus",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("rsvpStatus") as RsvpStatus;
          return (
            <StatusBadge type="rsvp" value={status} className="text-xs" />
          );
        },
      },
      {
        accessorKey: "checkedIn",
        header: "Check-in",
        cell: ({ row }) => (
          <div className="flex items-center">
            {row.original.checkedIn ? (
              <CheckCircle className="h-4 w-4 text-primary" />
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: () => (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );
}
