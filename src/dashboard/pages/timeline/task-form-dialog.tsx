"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { TimelineTask } from "@/types/wedding";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_SUGGESTIONS = [
  "Venue",
  "Attire",
  "Legal",
  "Guests",
  "Catering",
  "Photo & video",
  "Music",
  "Decor",
  "Invitations",
  "Honeymoon",
];

const onboardingInputClass =
  "h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-[15px] font-normal text-foreground shadow-none placeholder:text-[13px] placeholder:font-normal placeholder:text-muted-foreground/45 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200 disabled:opacity-50";

function messageFromApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}

export type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editingTask: TimelineTask | null;
  onSaved: (task: TimelineTask) => void;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  editingTask,
  onSaved,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingTask) {
      setTitle(editingTask.title);
      setCategory(editingTask.category ?? "");
      setVendorName(editingTask.vendorName ?? "");
      setNotes(editingTask.notes ?? "");
      setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate) : undefined);
    } else {
      setTitle("");
      setCategory("");
      setVendorName("");
      setNotes("");
      setDueDate(undefined);
    }
  }, [open, mode, editingTask]);

  const handleOpenChange = (next: boolean) => onOpenChange(next);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      toast.error("Enter a task title");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/timeline-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t,
            category: category.trim() || undefined,
            vendorName: vendorName.trim() || undefined,
            notes: notes.trim() || undefined,
            dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: unknown;
          task?: TimelineTask;
        };
        if (!res.ok) {
          throw new Error(messageFromApiError(data.error, "Failed to create task"));
        }
        if (data.task) {
          onSaved(data.task);
          toast.success("Task added");
          handleOpenChange(false);
        }
      } else if (editingTask) {
        const res = await fetch(`/api/timeline-tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t,
            category: category.trim() || null,
            vendorName: vendorName.trim() || null,
            notes: notes.trim() || null,
            dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: unknown;
          task?: TimelineTask;
        };
        if (!res.ok) {
          throw new Error(messageFromApiError(data.error, "Failed to update task"));
        }
        if (data.task) {
          onSaved(data.task);
          toast.success("Task updated");
          handleOpenChange(false);
        }
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
      onOpenChange={(o) => !saving && handleOpenChange(o)}
      direction="bottom"
    >
      <DrawerContent className="mx-auto max-w-md rounded-t-2xl border-t border-border/60 pb-safe">
        <DrawerHeader className="px-5 pb-2 pt-2">
          <DrawerTitle className="text-[15px] font-semibold text-foreground">
            {mode === "create" ? "New task" : "Edit task"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {mode === "create"
              ? "Enter details for a new checklist task."
              : "Update checklist task details."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto">
          <form id="task-form" onSubmit={handleSubmit} className="divide-y divide-border/40 px-5">
            <div className="py-4">
            <Label
              htmlFor="task-form-title"
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-playfair)]"
            >
              What needs doing
            </Label>
            <Input
              id="task-form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
              disabled={saving}
              className={onboardingInputClass}
            />
            </div>

            <div className="py-4">
            <Label
              htmlFor="task-form-category"
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-playfair)]"
            >
              Category
            </Label>
            <Input
              id="task-form-category"
              list="task-category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              autoComplete="off"
              disabled={saving}
              className={onboardingInputClass}
            />
            <datalist id="task-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            </div>

            <div className="py-4">
            <Label
              htmlFor="task-form-vendor"
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-playfair)]"
            >
              Vendor / contact
            </Label>
            <Input
              id="task-form-vendor"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              autoComplete="off"
              disabled={saving}
              className={onboardingInputClass}
            />
            </div>

            <div className="py-4">
            <Label
              htmlFor="task-form-notes"
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-playfair)]"
            >
              Notes
            </Label>
            <Textarea
              id="task-form-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              rows={3}
              className="min-h-[4.5rem] resize-none rounded-md border-border/80 bg-transparent text-[15px] font-normal placeholder:text-muted-foreground/45 focus-visible:border-primary focus-visible:ring-primary/30"
            />
            </div>

            <div className="py-4">
            <Label
              htmlFor="task-form-due-date"
              className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground [font-family:var(--font-playfair)]"
            >
              Due date
            </Label>
            <input
              id="task-form-due-date"
              type="date"
              disabled={saving}
              value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setDueDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)
              }
              className={cn(
                onboardingInputClass,
                "cursor-pointer [color-scheme:light] dark:[color-scheme:dark]",
              )}
            />
            {dueDate ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => setDueDate(undefined)}
                className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground underline-offset-2 hover:underline"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Clear date
              </button>
            ) : null}
            </div>
          </form>
        </div>

        <div className="flex items-center gap-3 border-t border-border/40 px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleOpenChange(false)}
            className="flex-1 rounded-full border border-border/60 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-45 [font-family:var(--font-playfair)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={saving}
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
