"use client";

import { useMemo, useState } from "react";
import type { TaskStatus, TimelineTask } from "@/types/wedding";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  ListChecks,
  Clock,
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
  Check,
  CalendarDays,
  Tag,
  Building2,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TaskFormDialog } from "@/dashboard/pages/timeline/task-form-dialog";

const microLabelClass =
  "text-[10px] font-medium tracking-[0.26em] uppercase text-muted-foreground [font-family:var(--font-playfair)]";

function messageFromApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    for (const v of Object.values(error as Record<string, unknown>)) {
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}

export function TimelinePage({ initialTasks }: { initialTasks: TimelineTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formTask, setFormTask] = useState<TimelineTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimelineTask | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks],
  );

  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const todoTasks = tasks.filter((t) => t.status === "TODO").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const persistTaskStatus = async (taskId: string, status: TaskStatus) => {
    const prev = tasks.find((t) => t.id === taskId);
    if (!prev) return;

    setPendingTaskId(taskId);
    setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status } : t)));

    try {
      const res = await fetch(`/api/timeline-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        task?: TimelineTask;
      };
      if (!res.ok) {
        throw new Error(messageFromApiError(data.error, "Failed to update task"));
      }
      if (data.task) {
        setTasks((p) => p.map((t) => (t.id === taskId ? data.task! : t)));
      }
    } catch (e) {
      setTasks((p) => p.map((t) => (t.id === taskId ? { ...t, status: prev.status } : t)));
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    } finally {
      setPendingTaskId(null);
    }
  };

  const applyReorder = async (orderedIds: string[]) => {
    setReordering(true);
    try {
      const res = await fetch("/api/timeline-tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(messageFromApiError(data.error, "Failed to reorder"));
      }
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        return orderedIds.map((id, i) => {
          const t = map.get(id)!;
          return { ...t, sortOrder: i };
        });
      });
      toast.success("Order updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder");
    } finally {
      setReordering(false);
    }
  };

  const moveTask = (taskId: string, dir: -1 | 1) => {
    const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
    const i = sorted.findIndex((t) => t.id === taskId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[i], next[j]] = [next[j], next[i]];
    void applyReorder(next.map((t) => t.id));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/timeline-tasks/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(messageFromApiError(data.error, "Failed to delete"));
      }
      setTasks((p) => p.filter((t) => t.id !== deleteTarget.id));
      toast.success("Task removed");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  const openCreate = () => {
    setFormMode("create");
    setFormTask(null);
    setFormOpen(true);
  };

  const openEdit = (task: TimelineTask) => {
    setFormMode("edit");
    setFormTask(task);
    setFormOpen(true);
  };

  const handleFormSaved = (task: TimelineTask) => {
    if (formMode === "create") {
      setTasks((p) => [...p, task].sort((a, b) => a.sortOrder - b.sortOrder));
    } else {
      setTasks((p) => p.map((t) => (t.id === task.id ? task : t)));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-row items-center justify-between gap-3 sm:items-end sm:gap-5">
        <div className="min-w-0 flex-1 pr-2">
          <h1
            className="text-[1.85rem] font-normal leading-tight tracking-tight text-foreground sm:text-[2.1rem]"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Wedding checklist
          </h1>
        </div>
        <button
          type="button"
          aria-label="Add task"
          onClick={openCreate}
          className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary px-0 text-[10px] font-medium tracking-[0.14em] uppercase text-primary transition-colors duration-300 hover:text-background sm:w-auto sm:px-5 sm:text-[11px] sm:tracking-[0.2em]"
        >
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
          />
          <span className="relative flex items-center gap-1.5 sm:gap-2">
            <Plus className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span className="hidden whitespace-nowrap sm:inline">Add task</span>
          </span>
        </button>
      </div>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        editingTask={formMode === "edit" ? formTask : null}
        onSaved={handleFormSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This removes “${deleteTarget.title}” from your checklist.`
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
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 gap-px border border-border/70 bg-border/60 lg:grid-cols-4">
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>Done</p>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-4 font-mono text-[1.65rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.75rem]">
            {doneTasks}
          </p>
        </div>
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>In progress</p>
            <Clock className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-4 font-mono text-[1.65rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.75rem]">
            {inProgressTasks}
          </p>
        </div>
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>To do</p>
            <Circle className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-4 font-mono text-[1.65rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.75rem]">
            {todoTasks}
          </p>
        </div>
        <div className="flex flex-col bg-background px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>Complete</p>
            <ListChecks className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-4 font-mono text-[1.65rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.75rem]">
            {progressPercent}%
          </p>
          <Progress
            value={progressPercent}
            className="mt-4 h-1.5 bg-muted/80 [&>div]:bg-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 px-1">
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-primary/55" aria-hidden />
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary [font-family:var(--font-playfair)]">
            Tasks
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center border border-border/60 bg-background px-4 py-12 sm:px-5">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground [font-family:var(--font-playfair)]">
              No tasks yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sortedTasks.map((task) => {
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== "DONE";
              const globalIndex = sortedTasks.findIndex((t) => t.id === task.id);
              const canReorder = sortedTasks.length > 1;
              const dueLabel = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "group relative flex flex-col rounded-xl border bg-background shadow-sm transition-shadow hover:shadow-md",
                    task.status === "DONE"
                      ? "border-primary/30 bg-muted/10"
                      : "border-border/60",
                  )}
                >
                  <div className="flex items-start gap-2 px-3.5 pt-3 pb-2.5">
                    <Checkbox
                      checked={task.status === "DONE"}
                      disabled={pendingTaskId === task.id}
                      onCheckedChange={(checked) => {
                        if (checked === "indeterminate") return;
                        void persistTaskStatus(task.id, checked ? "DONE" : "TODO");
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "line-clamp-2 text-[14px] font-medium leading-snug tracking-tight text-foreground",
                          task.status === "DONE" &&
                            "text-muted-foreground line-through decoration-muted-foreground/50",
                        )}
                      >
                        {task.title}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge type="task" value={task.status} />
                        {task.category ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" aria-hidden />
                            {task.category}
                          </span>
                        ) : null}
                        {task.vendorName ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Building2 className="h-2.5 w-2.5" aria-hidden />
                            {task.vendorName}
                          </span>
                        ) : null}
                        {dueLabel ? (
                          <time
                            dateTime={task.dueDate!}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tabular-nums",
                              isOverdue
                                ? "border-destructive/35 bg-destructive/10 text-destructive"
                                : "border-border/50 bg-muted/30 text-muted-foreground",
                            )}
                          >
                            <CalendarDays className="h-2.5 w-2.5" aria-hidden />
                            {dueLabel}
                          </time>
                        ) : null}
                      </div>

                      {task.notes ? (
                        <p className="mt-1.5 inline-flex line-clamp-2 items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
                          {task.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex w-7 shrink-0 justify-end pl-0.5 sm:w-8 sm:pl-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={pendingTaskId === task.id}
                            className="h-7 w-7 touch-manipulation rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground sm:h-8 sm:rounded-lg"
                            aria-label="Task actions"
                          >
                            <MoreHorizontal
                              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-[min(100vw-2rem,13rem)] min-w-[11rem]"
                        >
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Status
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={task.status === "TODO"}
                            className="gap-2.5"
                            onClick={() => void persistTaskStatus(task.id, "TODO")}
                          >
                            <Circle
                              className="size-3.5 shrink-0 text-muted-foreground"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                            <span>To do</span>
                            {task.status === "TODO" ? (
                              <Check className="ml-auto size-4 text-primary" aria-hidden />
                            ) : null}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={task.status === "IN_PROGRESS"}
                            className="gap-2.5"
                            onClick={() => void persistTaskStatus(task.id, "IN_PROGRESS")}
                          >
                            <Loader2
                              className="size-3.5 shrink-0 animate-spin text-sky-600 dark:text-sky-400"
                              aria-hidden
                            />
                            <span>In progress</span>
                            {task.status === "IN_PROGRESS" ? (
                              <Check className="ml-auto size-4 text-primary" aria-hidden />
                            ) : null}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={task.status === "DONE"}
                            className="gap-2.5"
                            onClick={() => void persistTaskStatus(task.id, "DONE")}
                          >
                            <CheckCircle2
                              className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                              aria-hidden
                            />
                            <span>Done</span>
                            {task.status === "DONE" ? (
                              <Check className="ml-auto size-4 text-primary" aria-hidden />
                            ) : null}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2.5" onClick={() => openEdit(task)}>
                            <Pencil className="size-3.5" aria-hidden />
                            Edit task
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2.5"
                            onClick={() => setDeleteTarget(task)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {canReorder ? (
                    <div className="flex items-center justify-end gap-1 border-t border-border/50 px-3 py-1.5">
                      <button
                        type="button"
                        aria-label="Move task up"
                        disabled={reordering || globalIndex <= 0}
                        onClick={() => moveTask(task.id, -1)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                      >
                        <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move task down"
                        disabled={reordering || globalIndex >= sortedTasks.length - 1}
                        onClick={() => moveTask(task.id, 1)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                      >
                        <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
