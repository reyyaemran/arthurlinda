"use client";

import type { GuestFilters } from "@/types/wedding";

interface GuestsFiltersProps {
  filters: GuestFilters;
  onFiltersChange: (filters: Partial<GuestFilters>) => void;
}

export function GuestsFilters({
  filters,
  onFiltersChange,
}: GuestsFiltersProps) {
  return null;
}
