"use client";

import { useEffect, useMemo, useState } from "react";
import type { BudgetCategory, Expense, Invoice, Vendor } from "@/types/wedding";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { RadialBar, RadialBarChart } from "recharts";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { VendorInvoicesSheet } from "@/dashboard/pages/vendors/components/vendor-invoices-sheet";
import { CategoryFormDialog } from "@/dashboard/pages/budget-combined/category-form-dialog";
import { ExpenseFormDialog } from "@/dashboard/pages/budget-combined/expense-form-dialog";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;
const radialConfig = {
  value: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  }
}

function currencySymbol(currency: string) {
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? "$";
  } catch {
    return "$";
  }
}

function fmtCompact(amount: number, currency: string) {
  const symbol = currencySymbol(currency);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);

  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    const txt = v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, "");
    return `${sign}${symbol}${txt}m`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    const txt = v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, "");
    return `${sign}${symbol}${txt}k`;
  }
  return `${sign}${fmt(abs, currency)}`;
}

function messageFromApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}

function StatRadial({
  label,
  value,
  amount,
  colorVar = "var(--chart-1)",
}: {
  label: string;
  value: number;
  amount: string;
  colorVar?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const data = [{ key: "value", value: safe, fill: colorVar }];
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground [font-family:var(--font-playfair)]">
          {label}
        </p>
        <p className="mt-2 whitespace-nowrap font-mono text-[1.2rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.35rem]">
          {amount}
        </p>
      </div>
      <div className="relative h-16 w-16 shrink-0">
        <ChartContainer config={radialConfig} className="h-16 w-16">
          <RadialBarChart data={data} innerRadius={22} outerRadius={30} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={20} background />
          </RadialBarChart>
        </ChartContainer>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-foreground/85">
          {safe}%
        </span>
      </div>
    </div>
  );
}


type BudgetCombinedPageProps = {
  defaultTab?: "categories" | "expenses";
  categories: BudgetCategory[];
  expenses: Expense[];
  invoices: Invoice[];
  vendors: Vendor[];
  currency: string;
};

export function BudgetCombinedPage({
  defaultTab = "categories",
  categories: categoriesProp,
  expenses: expensesProp,
  invoices,
  vendors,
  currency,
}: BudgetCombinedPageProps) {

  // Local state mirrors the server props so we can mutate optimistically.
  const [categories, setCategories] = useState(categoriesProp);
  const [expenses, setExpenses] = useState(expensesProp);

  useEffect(() => setCategories(categoriesProp), [categoriesProp]);
  useEffect(() => setExpenses(expensesProp), [expensesProp]);

  // Dialogs / sheets.
  const [invoicesSheetOpen, setInvoicesSheetOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedVendorName, setSelectedVendorName] = useState("");

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseFormMode, setExpenseFormMode] = useState<"create" | "edit">("create");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [defaultExpenseCategoryId, setDefaultExpenseCategoryId] = useState<string | null>(
    null,
  );

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<BudgetCategory | null>(
    null,
  );
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingExpenseId, setPendingExpenseId] = useState<string | null>(null);

  // Pagination.
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;

  const totalBudget = categories.reduce((s, c) => s + c.allocatedAmount, 0);
  const totalCommitted = categories.reduce((s, c) => s + c.committedAmount, 0);
  const totalSpent = categories.reduce((s, c) => s + c.totalSpent, 0);
  const remaining = totalBudget - totalCommitted;
  const overBudget = remaining < 0;
  const spentPct =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const committedPct =
    totalBudget > 0 ? Math.min(100, Math.round((totalCommitted / totalBudget) * 100)) : 0;
  const remainingPct =
    totalBudget > 0
      ? Math.max(0, Math.min(100, Math.round((Math.max(remaining, 0) / totalBudget) * 100)))
      : 0;
  const overBudgetPct =
    totalBudget > 0 && overBudget
      ? Math.min(100, Math.round((Math.abs(remaining) / totalBudget) * 100))
      : 0;

  const overdueCount = useMemo(
    () => expenses.filter((e) => e.paymentStatus === "OVERDUE").length,
    [expenses],
  );
  const expensesByCategory = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const row = map.get(e.categoryId);
      if (row) row.push(e);
      else map.set(e.categoryId, [e]);
    }
    return map;
  }, [expenses]);

  const paginatedCategories = useMemo(() => {
    const start = pageIndex * pageSize;
    return categories.slice(start, start + pageSize);
  }, [pageIndex, pageSize, categories]);

  const paginatedExpenses = useMemo(() => {
    const start = pageIndex * pageSize;
    return expenses.slice(start, start + pageSize);
  }, [pageIndex, pageSize, expenses]);

  const totalCategories = categories.length;
  const pageCountCategories = Math.ceil(totalCategories / pageSize) || 1;
  const pageCount = pageCountCategories;

  // Reset to first page.
  useEffect(() => {
    setPageIndex(0);
  }, []);

  // Clamp page index when data shrinks.
  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1));
  }, [pageIndex, pageCount]);

  const openInvoicesFor = (vendorId: string | null, vendorName: string) => {
    setSelectedVendorId(vendorId);
    setSelectedVendorName(vendorName);
    setInvoicesSheetOpen(true);
  };

  // ── Category CRUD wiring ────────────────────────────────────────────
  const openCreateCategory = () => {
    setCategoryFormMode("create");
    setEditingCategory(null);
    setCategoryFormOpen(true);
  };
  const openEditCategory = (cat: BudgetCategory) => {
    setCategoryFormMode("edit");
    setEditingCategory(cat);
    setCategoryFormOpen(true);
  };
  const handleCategorySaved = (cat: BudgetCategory) => {
    setCategories((prev) => {
      const i = prev.findIndex((c) => c.id === cat.id);
      if (i === -1) return [...prev, cat];
      const copy = [...prev];
      copy[i] = { ...copy[i], ...cat };
      return copy;
    });
  };

  // ── Expense CRUD wiring ─────────────────────────────────────────────
  const openCreateExpense = (categoryId?: string) => {
    if (categories.length === 0) {
      toast.error("Add a category first");
      openCreateCategory();
      return;
    }
    setExpenseFormMode("create");
    setEditingExpense(null);
    setDefaultExpenseCategoryId(categoryId ?? null);
    setExpenseFormOpen(true);
  };
  const openEditExpense = (exp: Expense) => {
    setExpenseFormMode("edit");
    setEditingExpense(exp);
    setExpenseFormOpen(true);
  };
  const handleExpenseSaved = (exp: Expense) => {
    setExpenses((prev) => {
      const i = prev.findIndex((e) => e.id === exp.id);
      if (i === -1) return [exp, ...prev];
      const copy = [...prev];
      copy[i] = exp;
      return copy;
    });
    // Update category aggregates without a server round-trip.
    setCategories((prev) =>
      prev.map((c) => {
        const expensesForCat = (() => {
          const before = expenses.filter((e) => e.categoryId === c.id && e.id !== exp.id);
          if (exp.categoryId === c.id) return [...before, exp];
          return before;
        })();
        return {
          ...c,
          totalSpent: expensesForCat.reduce((s, e) => s + e.paidAmount, 0),
          committedAmount: expensesForCat.reduce((s, e) => s + e.amount, 0),
          expenseCount: expensesForCat.length,
        };
      }),
    );
  };

  const markFullyPaid = async (exp: Expense) => {
    if (exp.paymentStatus === "PAID") return;
    setPendingExpenseId(exp.id);
    try {
      const res = await fetch(`/api/budget/expenses/${exp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: exp.amount }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        expense?: Expense;
      };
      if (!res.ok) {
        throw new Error(messageFromApiError(data.error, "Failed to mark paid"));
      }
      if (data.expense) {
        handleExpenseSaved(data.expense);
        toast.success("Marked as fully paid");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPendingExpenseId(null);
    }
  };

  // ── Delete flows ────────────────────────────────────────────────────
  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/budget/categories/${deleteCategoryTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        deletedExpenseIds?: string[];
      };
      if (!res.ok) {
        throw new Error(messageFromApiError(data.error, "Failed to delete category"));
      }
      const removedIds = new Set(data.deletedExpenseIds ?? []);
      setExpenses((prev) => prev.filter((e) => !removedIds.has(e.id)));
      setCategories((prev) => prev.filter((c) => c.id !== deleteCategoryTarget.id));
      toast.success("Category deleted");
      setDeleteCategoryTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!deleteExpenseTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/budget/expenses/${deleteExpenseTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(messageFromApiError(data.error, "Failed to delete expense"));
      }
      const target = deleteExpenseTarget;
      setExpenses((prev) => prev.filter((e) => e.id !== target.id));
      setCategories((prev) =>
        prev.map((c) =>
          c.id === target.categoryId
            ? {
                ...c,
                totalSpent: c.totalSpent - target.paidAmount,
                committedAmount: c.committedAmount - target.amount,
                expenseCount: Math.max(0, c.expenseCount - 1),
              }
            : c,
        ),
      );
      toast.success("Expense deleted");
      setDeleteExpenseTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const microLabelClass =
    "text-[10px] font-medium tracking-[0.26em] uppercase text-muted-foreground [font-family:var(--font-playfair)]";

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1
            className="text-[1.85rem] font-normal leading-tight tracking-tight text-foreground sm:text-[2.1rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Budget Tracker
          </h1>
        </div>
        <button
          type="button"
            aria-label="Add category"
            onClick={openCreateCategory}
          className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary px-0 text-[11px] tracking-[0.2em] uppercase text-primary transition-colors duration-300 hover:text-background sm:w-auto sm:px-5"
        >
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
          />
          <span className="relative flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
                Add category
            </span>
          </span>
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-px border border-border/70 bg-border/60 lg:grid-cols-4">
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <StatRadial
            label="Total budget"
            value={committedPct}
            amount={fmtCompact(totalBudget, currency)}
            colorVar="var(--primary)"
          />
        </div>
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <StatRadial
            label="Expense"
            value={committedPct}
            amount={fmtCompact(totalCommitted, currency)}
            colorVar="var(--chart-5)"
          />
        </div>
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <StatRadial
            label="Paid out"
            value={spentPct}
            amount={fmtCompact(totalSpent, currency)}
            colorVar="var(--chart-1)"
          />
        </div>
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <StatRadial
            label={overBudget ? "Over budget" : "Remaining"}
            value={overBudget ? overBudgetPct : remainingPct}
            amount={fmtCompact(Math.abs(remaining), currency)}
            colorVar={overBudget ? "var(--destructive)" : "var(--chart-4)"}
          />
        </div>
      </div>

      {overdueCount > 0 ? (
        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/[0.06] px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-destructive">
              {overdueCount} {overdueCount === 1 ? "expense is" : "expenses are"} past due
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
              Tap an expense on a card to review and update it.
            </p>
          </div>
        </div>
      ) : null}

      {/* Category cards */}
      <div>
        {paginatedCategories.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paginatedCategories.map((cat) => {
                  const catExpenses = expensesByCategory.get(cat.id) ?? [];
                  const budgetPct =
                    cat.allocatedAmount > 0
                      ? Math.min(100, Math.round((cat.committedAmount / cat.allocatedAmount) * 100))
                      : cat.committedAmount > 0
                        ? 100
                        : 0;
                  const overBudgetCat = cat.committedAmount > cat.allocatedAmount && cat.allocatedAmount > 0;
                  const paidCount = catExpenses.filter((e) => e.paymentStatus === "PAID").length;
                  const ringColor = overBudgetCat
                    ? "var(--destructive)"
                    : budgetPct >= 80
                      ? "var(--chart-1)"
                      : "var(--chart-4)";
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "group relative flex flex-col rounded-2xl border bg-background shadow-sm transition-shadow hover:shadow-md",
                        overBudgetCat ? "border-destructive/40" : "border-border/60",
                      )}
                    >
                      {/* ── Top: radial + meta + actions ─────────────────── */}
                      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                        {/* Large radial ring */}
                        <div className="relative h-14 w-14 shrink-0">
                          <ChartContainer config={radialConfig} className="h-14 w-14">
                            <RadialBarChart
                              data={[{ key: "v", value: budgetPct, fill: ringColor }]}
                              innerRadius={19}
                              outerRadius={27}
                              startAngle={90}
                              endAngle={-270}
                            >
                              <RadialBar dataKey="value" cornerRadius={20} background />
                            </RadialBarChart>
                          </ChartContainer>
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums leading-none text-foreground">
                            {budgetPct}%
                          </span>
                        </div>

                        {/* Name */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold leading-snug text-foreground">
                            {cat.name}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                            {cat.allocatedAmount > 0
                              ? fmt(cat.allocatedAmount, currency)
                              : "—"}
                          </p>
                        </div>

                        {/* Actions menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 touch-manipulation rounded-full"
                              aria-label="Category actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[10rem]">
                            <DropdownMenuItem className="gap-2" onClick={() => openCreateExpense(cat.id)}>
                              <Plus className="h-3.5 w-3.5" /> Add expense
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => openEditCategory(cat)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="gap-2"
                              onClick={() => setDeleteCategoryTarget(cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* ── Expense rows ──────────────────────────────────── */}
                      {catExpenses.length > 0 && (
                        <div className="border-t border-border/40 px-4 py-2 space-y-0.5">
                          {catExpenses.slice(0, 4).map((exp) => {
                            const isPaid = exp.paymentStatus === "PAID";
                            const dueRaw = exp.dueDate ? parseISO(exp.dueDate) : null;
                            const today = new Date(); today.setHours(0,0,0,0);
                            const isUpcoming = dueRaw ? dueRaw > today : false;
                            const dateLabel = isPaid && exp.paidDate
                              ? format(parseISO(exp.paidDate), "d MMM")
                              : dueRaw
                                ? (isUpcoming ? `due ${format(dueRaw, "d MMM")}` : format(dueRaw, "d MMM"))
                                : null;
                            return (
                              <button
                                key={exp.id}
                                type="button"
                                onClick={() => setViewingExpense(exp)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/30"
                              >
                                {/* status dot */}
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 shrink-0 rounded-full",
                                    isPaid
                                      ? "bg-[var(--chart-2)]"
                                      : isUpcoming
                                        ? "bg-[var(--chart-1)]"
                                        : "border border-muted-foreground/40 bg-transparent",
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85">
                                  {exp.description}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 font-mono text-[10px] tabular-nums",
                                    isPaid ? "text-[var(--chart-2)]" : isUpcoming ? "text-[var(--chart-1)]" : "text-muted-foreground",
                                  )}
                                >
                                  {fmt(exp.amount, currency)}
                                </span>
                                {dateLabel && (
                                  <span className={cn(
                                    "shrink-0 text-[10px] tabular-nums",
                                    isUpcoming && !isPaid ? "text-[var(--chart-1)]/70" : "text-muted-foreground/50",
                                  )}>
                                    {dateLabel}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {catExpenses.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setViewingExpense(catExpenses[4] ?? null)}
                              className="w-full py-1 text-center text-[10px] text-muted-foreground/70 hover:text-primary"
                            >
                              +{catExpenses.length - 4} more
                            </button>
                          )}
                        </div>
                      )}

                      {/* ── Footer ───────────────────────────────────────── */}
                      <div
                        className={cn(
                          "mt-auto flex items-center justify-between gap-2 border-t px-4 py-2.5",
                          overBudgetCat ? "border-destructive/20 bg-destructive/[0.03]" : "border-border/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => openCreateExpense(cat.id)}
                          className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                          <Plus className="h-3 w-3" />
                          Add expense
                        </button>
                        <div className="flex items-center gap-2">
                          {overBudgetCat && (
                            <span className="text-[9.5px] font-medium uppercase tracking-wide text-destructive">
                              over budget
                            </span>
                          )}
                          {catExpenses.length > 0 && (
                            <span className="text-[10px] tabular-nums text-muted-foreground/70">
                              {paidCount}/{catExpenses.length} paid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-[13px] font-medium text-foreground">No categories yet</p>
            <button
              type="button"
              onClick={openCreateCategory}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary hover:text-background [font-family:var(--font-playfair)]"
            >
              <Plus className="h-3 w-3" />
              Add your first category
            </button>
          </div>
        )}

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex justify-end pt-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                disabled={pageIndex >= pageCount - 1}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Per-expense detail drawer */}
      <Drawer open={!!viewingExpense} onOpenChange={(o) => !o && setViewingExpense(null)} direction="bottom">
        <DrawerContent className="mx-auto max-w-md rounded-t-2xl border-t border-border/60 pb-safe">
          <DrawerHeader className="px-5 pb-2 pt-2">
            <DrawerTitle className="truncate text-[15px] font-semibold text-foreground">
              {viewingExpense?.description ?? "Expense"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">Expense details</DrawerDescription>
          </DrawerHeader>

          {viewingExpense && (
            <div className="divide-y divide-border/40 px-5">
              {/* Amount row */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground [font-family:var(--font-playfair)]">
                  Amount
                </span>
                <span className="font-mono text-[15px] tabular-nums text-foreground">
                  {fmt(viewingExpense.amount, currency)}
                </span>
              </div>

              {/* Status row */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground [font-family:var(--font-playfair)]">
                  Status
                </span>
                <StatusBadge type="payment" value={viewingExpense.paymentStatus} />
              </div>

              {/* Due date row */}
              {viewingExpense.dueDate && (
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground [font-family:var(--font-playfair)]">
                    Due date
                  </span>
                  <span className="text-[13px] text-foreground">
                    {format(parseISO(viewingExpense.dueDate), "d MMMM yyyy")}
                  </span>
                </div>
              )}

              {/* Notes row */}
              {viewingExpense.notes && (
                <div className="py-3.5">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground [font-family:var(--font-playfair)]">
                    Notes
                  </span>
                  <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">
                    {viewingExpense.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-border/40 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                if (viewingExpense) openEditExpense(viewingExpense);
                setViewingExpense(null);
              }}
              className="flex-1 rounded-full border border-border/60 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground [font-family:var(--font-playfair)]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (viewingExpense) setDeleteExpenseTarget(viewingExpense);
                setViewingExpense(null);
              }}
              className="flex-1 rounded-full border border-destructive/50 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.2em] text-destructive transition-colors hover:bg-destructive/5 [font-family:var(--font-playfair)]"
            >
              Delete
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Dialogs / sheets */}
      <CategoryFormDialog
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        mode={categoryFormMode}
        editingCategory={categoryFormMode === "edit" ? editingCategory : null}
        currency={currency}
        onSaved={handleCategorySaved}
      />

      <ExpenseFormDialog
        open={expenseFormOpen}
        onOpenChange={setExpenseFormOpen}
        mode={expenseFormMode}
        editingExpense={expenseFormMode === "edit" ? editingExpense : null}
        categories={categories}
        currency={currency}
        defaultCategoryId={defaultExpenseCategoryId}
        onSaved={handleExpenseSaved}
      />

      <AlertDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteCategoryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteCategoryTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCategoryTarget && deleteCategoryTarget.expenseCount > 0
                ? `This will also remove ${deleteCategoryTarget.expenseCount} expense${deleteCategoryTarget.expenseCount === 1 ? "" : "s"} attached to this category. This can’t be undone.`
                : "This category will be removed from your budget. This can’t be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => void confirmDeleteCategory()}
            >
              {deleting ? "Deleting…" : "Delete category"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteExpenseTarget}
        onOpenChange={(o) => !o && !deleting && setDeleteExpenseTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteExpenseTarget
                ? `“${deleteExpenseTarget.description}” will be removed from ${deleteExpenseTarget.categoryName}. This can’t be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => void confirmDeleteExpense()}
            >
              {deleting ? "Deleting…" : "Delete expense"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VendorInvoicesSheet
        vendorId={selectedVendorId}
        vendorName={selectedVendorName}
        open={invoicesSheetOpen}
        onOpenChange={setInvoicesSheetOpen}
        allInvoices={invoices}
        currency={currency}
      />
    </div>
  );
}
