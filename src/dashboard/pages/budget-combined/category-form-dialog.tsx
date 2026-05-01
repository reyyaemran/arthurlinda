"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BudgetCategory } from "@/types/wedding";
import { cn } from "@/lib/utils";

const onboardingInputClass =
  "h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] font-normal text-foreground shadow-none placeholder:text-[13px] placeholder:font-normal placeholder:text-muted-foreground/45 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200 disabled:opacity-50";

const labelClass =
  "text-[11px] font-medium uppercase tracking-[0.22em] text-foreground";

function messageFromApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}

export type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editingCategory: BudgetCategory | null;
  currency: string;
  onSaved: (category: BudgetCategory) => void;
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  editingCategory,
  currency,
  onSaved,
}: CategoryFormDialogProps) {
  const [name, setName] = useState("");
  const [allocated, setAllocated] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingCategory) {
      setName(editingCategory.name);
      setAllocated(String(editingCategory.allocatedAmount || ""));
    } else {
      setName("");
      setAllocated("");
    }
  }, [open, mode, editingCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a category name");
      return;
    }
    const allocatedNum = allocated.trim() === "" ? 0 : Number(allocated);
    if (Number.isNaN(allocatedNum) || allocatedNum < 0) {
      toast.error("Allocated amount must be 0 or more");
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/budget/categories"
          : `/api/budget/categories/${editingCategory!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, allocatedAmount: allocatedNum }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        category?: BudgetCategory;
      };
      if (!res.ok) {
        throw new Error(
          messageFromApiError(
            data.error,
            mode === "create" ? "Failed to add category" : "Failed to update category",
          ),
        );
      }
      if (data.category) {
        onSaved(data.category);
        toast.success(mode === "create" ? "Category added" : "Category updated");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden rounded-md border-border/70 p-0 sm:max-w-[420px]",
          "shadow-[0_24px_64px_-16px_rgba(30,35,15,0.14)]",
        )}
      >
        <div className="relative border-b border-border/60 bg-muted/20 px-8 pb-5 pt-10 text-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
            aria-label="Close"
            disabled={saving}
          >
            <X className="size-[18px]" strokeWidth={2} aria-hidden />
          </button>

          <DialogTitle
            className="border-0 p-0 text-center font-normal text-[1.75rem] leading-tight tracking-tight text-foreground shadow-none sm:text-[2rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {mode === "create" ? "New category" : "Edit category"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[12px] text-muted-foreground">
            Group expenses (Venue, Attire, Photo & video…) and set a target amount.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
          <div className="space-y-2 text-left">
            <Label
              htmlFor="cat-name"
              className={labelClass}
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Category name
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Venue & catering"
              autoComplete="off"
              autoFocus
              disabled={saving}
              className={onboardingInputClass}
            />
          </div>

          <div className="space-y-2 text-left">
            <Label
              htmlFor="cat-allocated"
              className={labelClass}
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Allocated ({currency})
            </Label>
            <Input
              id="cat-allocated"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={allocated}
              onChange={(e) => setAllocated(e.target.value)}
              placeholder="0"
              disabled={saving}
              className={onboardingInputClass}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Set the budget you want to spend in this category. You can update it later.
            </p>
          </div>

          <div className="space-y-4 pt-0.5">
            <button
              type="submit"
              disabled={saving}
              className="group relative w-full overflow-hidden rounded-full border border-primary px-8 py-3.5 text-[11px] tracking-[0.28em] uppercase text-primary transition-colors duration-300 hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
              />
              <span className="relative flex items-center justify-center gap-2">
                {saving && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                )}
                {saving
                  ? "Saving…"
                  : mode === "create"
                    ? "Add category"
                    : "Save changes"}
              </span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="w-full text-center text-[10px] font-medium tracking-[0.2em] uppercase text-destructive transition-colors hover:text-destructive/85 disabled:pointer-events-none disabled:opacity-45"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
