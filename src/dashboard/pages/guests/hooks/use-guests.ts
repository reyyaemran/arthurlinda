import { useState, useMemo, useEffect } from "react";
import type { Guest, GuestFilters } from "@/types/wedding";
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { useHeaderSearch } from "@/hooks/use-header-search";

export function useGuests(initialGuests: Guest[]) {
  const { query: headerSearch, setPlaceholder, show, hide } = useHeaderSearch();

  useEffect(() => {
    show();
    setPlaceholder("Search…");
    return () => hide();
  }, [show, hide, setPlaceholder]);

  const [filters, setFilters] = useState<GuestFilters>({
    category: "all",
    rsvpStatus: "all",
    side: "all",
    search: "",
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });

  const activeSearch = headerSearch || filters.search;

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [headerSearch]);

  const filteredGuests = useMemo(() => {
    return initialGuests.filter((guest) => {
      if (filters.category !== "all" && guest.category !== filters.category) return false;
      if (filters.rsvpStatus !== "all" && guest.rsvpStatus !== filters.rsvpStatus) return false;
      if (filters.side !== "all" && guest.side !== filters.side) return false;

      if (activeSearch) {
        const s = activeSearch.toLowerCase();
        const searchable = [guest.name, guest.phone, guest.email, guest.tableNumber]
          .filter(Boolean)
          .map((f) => f!.toLowerCase());
        if (!searchable.some((f) => f.includes(s))) return false;
      }

      return true;
    });
  }, [initialGuests, filters, activeSearch]);

  const paginatedGuests = useMemo(() => {
    if (filteredGuests.length === 0) return [];

    const sorted = [...filteredGuests].sort((a, b) => {
      for (const sort of sorting) {
        const key = sort.id as keyof Guest;
        const aVal = a[key] ?? "";
        const bVal = b[key] ?? "";
        const dir = sort.desc ? -1 : 1;
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
      }
      return 0;
    });

    const start = pagination.pageIndex * pagination.pageSize;
    return sorted.slice(start, start + pagination.pageSize);
  }, [filteredGuests, sorting, pagination]);

  const updateFilters = (newFilters: Partial<GuestFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater instanceof Function ? updater(sorting) : updater);
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setPagination(updater instanceof Function ? updater(pagination) : updater);
  };

  const handleClearFilters = () => {
    setFilters({ category: "all", rsvpStatus: "all", side: "all", search: "" });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return {
    allGuests: filteredGuests,
    guests: paginatedGuests,
    pageCount: Math.ceil(filteredGuests.length / pagination.pageSize),
    filters,
    sorting,
    pagination,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
  };
}
