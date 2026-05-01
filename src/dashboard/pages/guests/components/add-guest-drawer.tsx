"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { Guest, GuestCategory, GuestSide } from "@/types/wedding";

const inputClass =
  "h-11 rounded-none border-0 border-b border-border bg-transparent px-0 !text-[14px] font-normal text-foreground shadow-none !placeholder:text-[12px] placeholder:font-normal placeholder:text-muted-foreground/35 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200";

const selectTriggerClass =
  "h-11 rounded-none border-0 border-b border-border bg-transparent px-0 !text-[13px] font-normal shadow-none focus:ring-0 focus:ring-offset-0 data-[placeholder]:!text-[12px] data-[placeholder]:text-muted-foreground/35";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground/80 [font-family:var(--font-playfair)]">
      {children}
    </p>
  );
}

interface AddGuestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: Guest | null;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function AddGuestDrawer({ open, onOpenChange, guest }: AddGuestDrawerProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const isEdit = !!guest;

  const [loading, setLoading] = React.useState(false);
  const [category, setCategory] = React.useState(guest?.category ?? "FRIEND");
  const [side, setSide] = React.useState(guest?.side ?? "BOTH");

  // Sync select state when guest changes (e.g. opening different guests)
  React.useEffect(() => {
    setCategory(guest?.category ?? "FRIEND");
    setSide(guest?.side ?? "BOTH");
  }, [guest]);

  const handleSuccess = React.useCallback(() => {
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const body = {
        name: fd.get("name"),
        phone: fd.get("phone") || undefined,
        email: fd.get("email") || undefined,
        category,
        side,
        invitedPax: Number(fd.get("invitedPax") ?? 1),
        tableNumber: fd.get("tableNumber") || undefined,
        notes: fd.get("notes") || undefined,
      };

      const res = await fetch(
        isEdit ? `/api/guests/${guest.id}` : "/api/guests",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? `Failed to ${isEdit ? "update" : "add"} guest`);
        return;
      }

      toast.success(isEdit ? "Guest updated" : "Guest added");
      handleSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? "right" : "bottom"}
    >
      <DrawerContent
        className={
          isDesktop
            ? "right-0 top-0 bottom-0 left-auto mt-0 flex h-full w-full max-w-md flex-col rounded-none rounded-l-2xl border-l"
            : "mx-auto flex max-h-[90vh] flex-col rounded-t-2xl sm:max-w-md"
        }
      >
        <DrawerHeader className="shrink-0 px-5 pb-1 pt-3">
          <DrawerTitle className="text-[20px] font-semibold text-foreground">
            {isEdit ? "Edit guest" : "Add guest"}
          </DrawerTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isEdit ? "Update the guest details below" : "Fill in the guest details below"}
          </p>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="space-y-5">

              {/* Basic info */}
              <div className="space-y-4 rounded-xl border border-border/50 bg-muted/[0.18] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/75 [font-family:var(--font-playfair)]">
                  Basic info
                </p>

                <div className="space-y-0">
                  <FieldLabel>Full name <span className="text-destructive">*</span></FieldLabel>
                  <Input
                    name="name"
                    required
                    disabled={loading}
                    defaultValue={guest?.name ?? ""}
                    key={guest?.id ?? "new-name"}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-0">
                    <FieldLabel>Phone</FieldLabel>
                    <Input
                      name="phone"
                      type="tel"
                      disabled={loading}
                      defaultValue={guest?.phone ?? ""}
                      key={guest?.id ?? "new-phone"}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-0">
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      name="email"
                      type="email"
                      disabled={loading}
                      defaultValue={guest?.email ?? ""}
                      key={guest?.id ?? "new-email"}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Event details */}
              <div className="space-y-4 rounded-xl border border-border/50 bg-muted/[0.18] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/75 [font-family:var(--font-playfair)]">
                  Event details
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-0">
                    <FieldLabel>Category</FieldLabel>
                    <Select
                      value={category}
                      onValueChange={(v) => setCategory(v as GuestCategory)}
                      disabled={loading}
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-[13px]">
                        <SelectItem value="FAMILY">Family</SelectItem>
                        <SelectItem value="RELATIVE">Relative</SelectItem>
                        <SelectItem value="FRIEND">Friend</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                        <SelectItem value="COLLEAGUE">Colleague</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0">
                    <FieldLabel>Side</FieldLabel>
                    <Select
                      value={side}
                      onValueChange={(v) => setSide(v as GuestSide)}
                      disabled={loading}
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-[13px]">
                        <SelectItem value="GROOM">Groom</SelectItem>
                        <SelectItem value="BRIDE">Bride</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0">
                    <FieldLabel>Invited pax</FieldLabel>
                    <Input
                      name="invitedPax"
                      type="number"
                      min={1}
                      disabled={loading}
                      defaultValue={guest?.invitedPax ?? 1}
                      key={guest?.id ?? "new-pax"}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-0">
                  <FieldLabel>Table number</FieldLabel>
                  <Input
                    name="tableNumber"
                    disabled={loading}
                    defaultValue={guest?.tableNumber ?? ""}
                    key={guest?.id ?? "new-table"}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4 rounded-xl border border-border/50 bg-muted/[0.18] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/75 [font-family:var(--font-playfair)]">
                  Notes
                </p>
                <Textarea
                  name="notes"
                  rows={3}
                  disabled={loading}
                  defaultValue={guest?.notes ?? ""}
                  key={guest?.id ?? "new-notes"}
                  className="resize-none rounded-none border-0 border-b border-border bg-transparent px-0 text-sm font-normal shadow-none placeholder:text-muted-foreground/40 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200"
                />
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 space-y-2 border-t border-border/40 px-5 pb-5 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-full border border-primary px-8 py-2.5 text-[10.5px] tracking-[0.24em] uppercase text-primary transition-colors duration-300 hover:text-background disabled:cursor-not-allowed disabled:opacity-50 [font-family:var(--font-playfair)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
              />
              <span className="relative flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                {loading ? "Saving…" : isEdit ? "Update guest" : "Save guest"}
              </span>
            </button>

            <DrawerClose asChild>
              <button
                type="button"
                disabled={loading}
                className="w-full py-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 transition-colors hover:text-primary/70 disabled:opacity-50 [font-family:var(--font-playfair)]"
              >
                Cancel
              </button>
            </DrawerClose>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
