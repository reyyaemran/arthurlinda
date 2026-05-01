"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BudgetCategory, Expense } from "@/types/wedding";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] font-normal text-foreground shadow-none placeholder:text-[14px] placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200 disabled:opacity-50";

const labelClass =
  "text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-playfair)]";

function messageFromApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}

export type ExpenseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editingExpense: Expense | null;
  categories: BudgetCategory[];
  currency: string;
  /** When set, auto-selects this category (used when opening from a category card). */
  defaultCategoryId?: string | null;
  onSaved: (expense: Expense) => void;
};

export function ExpenseFormDialog({
  open,
  onOpenChange,
  mode,
  editingExpense,
  categories,
  currency,
  defaultCategoryId,
  onSaved,
}: ExpenseFormDialogProps) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingExpense) {
      setDescription(editingExpense.description);
      setCategoryId(editingExpense.categoryId);
      setAmount(String(editingExpense.amount || ""));
      setDueDate(editingExpense.dueDate ? new Date(editingExpense.dueDate) : undefined);
      setNotes(editingExpense.notes ?? "");
    } else {
      setDescription("");
      setCategoryId(defaultCategoryId ?? categories[0]?.id ?? "");
      setAmount("");
      setDueDate(new Date());
      setNotes("");
    }
  }, [open, mode, editingExpense, defaultCategoryId, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) { toast.error("Add a short description"); return; }
    if (!categoryId) { toast.error("Pick a category"); return; }
    const amountNum = amount.trim() === "" ? 0 : Number(amount);
    if (Number.isNaN(amountNum) || amountNum < 0) { toast.error("Amount must be 0 or more"); return; }

    setSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/budget/expenses"
          : `/api/budget/expenses/${editingExpense!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      // If due date is in the future → pending (paidAmount = 0), otherwise fully paid.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isUpcoming = dueDate ? dueDate > today : false;
      const resolvedPaid = isUpcoming ? 0 : amountNum;

      const body = {
        description: trimmed,
        categoryId,
        amount: amountNum,
        paidAmount: resolvedPaid,
        dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        notes: notes.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        expense?: Expense;
      };
      if (!res.ok) {
        throw new Error(
          messageFromApiError(
            data.error,
            mode === "create" ? "Failed to add expense" : "Failed to update expense",
          ),
        );
      }
      if (data.expense) {
        onSaved(data.expense);
        toast.success(mode === "create" ? "Expense added" : "Expense updated");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      direction="bottom"
    >
      <DrawerContent className="mx-auto max-w-md rounded-t-2xl border-t border-border/60 pb-safe">
        <DrawerHeader className="px-5 pb-2 pt-2">
          <DrawerTitle className="text-[15px] font-semibold text-foreground">
            {mode === "create" ? "New expense" : "Edit expense"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {mode === "create" ? "Add to category" : "Update details"}
          </DrawerDescription>
        </DrawerHeader>

        {/* Scrollable form body */}
        <div className="overflow-y-auto">
          <form
            id="expense-form"
            onSubmit={handleSubmit}
            className="divide-y divide-border/40 px-5"
          >
            {/* Description */}
            <div className="py-4">
              <Label htmlFor="exp-desc" className={labelClass}>Description</Label>
              <Input
                id="exp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoComplete="off"
                disabled={saving}
                className={inputClass}
              />
            </div>

            {/* Amount */}
            <div className="py-4">
              <Label htmlFor="exp-amount" className={labelClass}>
                Amount ({currency})
              </Label>
              <Input
                id="exp-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={saving}
                className={inputClass}
              />
            </div>

            {/* Due date */}
            <div className="py-4">
              <Label htmlFor="exp-due" className={labelClass}>Due date</Label>
              <input
                id="exp-due"
                type="date"
                disabled={saving}
                value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
                onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
                className={cn(
                  inputClass,
                  "cursor-pointer [color-scheme:light] dark:[color-scheme:dark]",
                )}
              />
            </div>

            {/* Notes */}
            <div className="py-4">
              <Label htmlFor="exp-notes" className={labelClass}>Notes</Label>
              <Textarea
                id="exp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
                rows={2}
                className="mt-1 min-h-[3rem] resize-none rounded-lg border-border/60 bg-transparent text-[15px] font-normal placeholder:text-[14px] placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-0"
              />
            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 border-t border-border/40 px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-full border border-border/60 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-45 [font-family:var(--font-playfair)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={saving || categories.length === 0}
            className="group relative flex-1 overflow-hidden rounded-full border border-primary py-2.5 text-[10.5px] uppercase tracking-[0.2em] text-primary transition-colors duration-300 hover:text-background disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--font-playfair)]"
          >
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
            />
            <span className="relative flex items-center justify-center gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
              {saving ? "Saving…" : mode === "create" ? "Add" : "Save"}
            </span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
