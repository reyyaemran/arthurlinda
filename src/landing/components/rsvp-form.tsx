"use client";

import { useState } from "react";
import { Loader2, Check, Copy } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GuestCategory, GuestSide } from "@/types/wedding";
import { RSVP_CATEGORIES } from "@/lib/wedding/relation";

type RsvpSide = Extract<GuestSide, "GROOM" | "BRIDE">;
type RsvpCategory = Extract<GuestCategory, "FAMILY" | "RELATIVE" | "FRIEND">;

type RsvpFormProps = {
  weddingSlug: string;
  /** Optional first names — used to label the side picker (e.g. "Arthur's side"). */
  groomName?: string;
  brideName?: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  /** Shown when a guest declines (above bank details). Falls back to default copy when empty. */
  giftInfo?: string;
};

const inputClass =
  "h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-transparent px-0 text-sm font-light text-foreground shadow-none placeholder:text-muted-foreground/45 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200";

const selectTriggerClass =
  "h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-transparent px-0 text-sm font-light text-foreground shadow-none focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-muted-foreground/45 transition-colors duration-200 hover:border-primary focus:border-primary";

const textareaClass =
  "min-h-[5.5rem] w-full min-w-0 resize-none rounded-none border-0 border-b border-border bg-transparent px-0 py-2 text-sm font-light shadow-none placeholder:text-muted-foreground/40 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10.5px] font-medium tracking-[0.22em] uppercase text-foreground/72"
      style={{ fontFamily: "var(--font-playfair)" }}
    >
      {children}
    </p>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      {hint ? (
        <p className="text-[12px] font-light leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}

export function RsvpForm({
  weddingSlug,
  groomName,
  brideName,
  bankName,
  bankAccount,
  bankHolder,
  giftInfo,
}: RsvpFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [attendance, setAttendance] = useState<"yes" | "no">("yes");
  const [pax, setPax] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [side, setSide] = useState<RsvpSide | null>(null);
  const [category, setCategory] = useState<RsvpCategory | null>(null);

  const sideLabel: Record<RsvpSide, string> = {
    GROOM: groomName?.trim() || "Groom",
    BRIDE: brideName?.trim() || "Bride",
  };
  const categoryLabel: Record<RsvpCategory, string> = {
    FAMILY: "Family",
    RELATIVE: "Relative",
    FRIEND: "Friend",
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (!name) { setError("Please enter your name."); return; }

    setPending(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingSlug, name,
          phone: phone || undefined,
          email: email || undefined,
          attendance,
          paxCount: attendance === "yes" ? Number(pax) : 0,
          side: side ?? undefined,
          category: category ?? undefined,
          message: message || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Could not send your response."); return; }
      setSubmitted(true);
      setSuccessOpen(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const copyAccount = () => {
    if (!bankAccount) return;
    navigator.clipboard.writeText(bankAccount).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-[26rem] border-border/70 p-0">
          <div className="px-7 py-8 text-center">
            <div className="mx-auto flex w-fit flex-col items-center gap-2.5">
              <span className="h-px w-10 bg-primary/20" aria-hidden />
              <span className="block h-2 w-2 rotate-45 border border-primary/50" aria-hidden />
              <span className="h-px w-10 bg-primary/20" aria-hidden />
            </div>
            <DialogTitle
              className="mt-5 text-[2rem] font-normal italic leading-snug text-foreground sm:text-[2.15rem]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {attendance === "yes" ? "See you there" : "Thank you for letting us know"}
            </DialogTitle>
            <DialogDescription className="mt-3 text-[15px] font-light leading-relaxed text-muted-foreground/95">
              {attendance === "yes"
                ? "We cannot wait to celebrate with you."
                : "You will be missed — we hope our paths cross again soon."}
            </DialogDescription>
            <button
              type="button"
              onClick={() => setSuccessOpen(false)}
              className="group relative mt-7 inline-flex h-10 min-w-[9rem] items-center justify-center overflow-hidden rounded-full border border-primary px-6 text-[11px] tracking-[0.22em] uppercase text-primary transition-colors duration-300 hover:text-primary-foreground"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              <span
                className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden
              />
              <span className="relative">Close</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <form
        onSubmit={(ev) => void handleSubmit(ev)}
        className="flex w-full max-w-xl flex-col gap-8 md:max-w-none"
      >
      {error && (
        <div
          className="border border-destructive/35 bg-destructive/[0.06] px-4 py-3.5"
          role="alert"
        >
          <p className="text-sm font-light leading-relaxed text-destructive">{error}</p>
        </div>
      )}

      {/* Contact */}
      <div className="flex w-full flex-col gap-7">
        <FieldGroup label="Full name">
          <Input
            id="rsvp-name"
            name="name"
            required
            disabled={pending}
            className={inputClass}
            autoComplete="name"
          />
        </FieldGroup>

        <div className="grid w-full grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-x-9 sm:gap-y-0">
          <FieldGroup label="Phone">
            <Input
              id="rsvp-phone"
              name="phone"
              disabled={pending}
              className={inputClass}
              autoComplete="tel"
            />
          </FieldGroup>
          <FieldGroup label="Email">
            <Input
              id="rsvp-email"
              name="email"
              type="email"
              disabled={pending}
              className={inputClass}
              autoComplete="email"
            />
          </FieldGroup>
        </div>
      </div>

      {/* Relation — whose side + how you know us */}
      <div className="flex w-full flex-col gap-4 border-y border-border/70 py-6">
        <FieldLabel>How are you connected?</FieldLabel>

        <div className="flex flex-col gap-3">
          <p className="text-[11.5px] font-light leading-relaxed text-muted-foreground">
            Whose side?
          </p>
          <div
            className="grid w-full grid-cols-2 overflow-hidden border border-border"
            role="group"
            aria-label="Whose side"
          >
            {(["GROOM", "BRIDE"] as const).map((val, idx) => {
              const active = side === val;
              return (
                <button
                  key={val}
                  type="button"
                  disabled={pending}
                  onClick={() => setSide(active ? null : val)}
                  aria-pressed={active}
                  className={cn(
                    "group relative flex min-h-[3.15rem] items-center justify-center gap-2 px-4 py-3 text-center transition-all duration-200",
                    idx === 0 && "border-r border-border",
                    active ? "bg-primary/[0.05]" : "hover:bg-muted/25",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-full w-0.5 bg-primary"
                    />
                  )}
                  <span
                    className={cn(
                      "text-[15px] font-normal italic transition-colors duration-200 sm:text-base",
                      active ? "text-foreground" : "text-muted-foreground/70",
                    )}
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {sideLabel[val]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[11.5px] font-light leading-relaxed text-muted-foreground">
            How are you related?
          </p>
          <div
            className="grid w-full grid-cols-3 overflow-hidden border border-border"
            role="group"
            aria-label="How are you connected?"
          >
            {RSVP_CATEGORIES.map((val, idx) => {
              const active = category === val;
              return (
                <button
                  key={val}
                  type="button"
                  disabled={pending}
                  onClick={() => setCategory(active ? null : val)}
                  aria-pressed={active}
                  className={cn(
                    "group relative flex min-h-[3.15rem] items-center justify-center px-3 py-3 text-center transition-all duration-200",
                    idx !== RSVP_CATEGORIES.length - 1 && "border-r border-border",
                    active ? "bg-primary/[0.05]" : "hover:bg-muted/25",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-full w-0.5 bg-primary"
                    />
                  )}
                  <span
                    className={cn(
                      "text-[14px] font-normal italic transition-colors duration-200 sm:text-[15px]",
                      active ? "text-foreground" : "text-muted-foreground/70",
                    )}
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {categoryLabel[val]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attendance */}
      <div className="flex w-full flex-col gap-3">
        <p
          className="text-[10.5px] font-medium tracking-[0.22em] uppercase text-foreground/72"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          Will you join us?
        </p>
        <div
          className="grid w-full grid-cols-2 overflow-hidden border border-border"
          role="group"
          aria-label="Attendance"
        >
          {(["yes", "no"] as const).map((val, idx) => {
            const active = attendance === val;
            return (
              <button
                key={val}
                type="button"
                disabled={pending}
                onClick={() => setAttendance(val)}
                className={cn(
                  "group relative flex min-h-[7.75rem] flex-col items-start justify-between gap-3 px-5 py-4.5 text-left transition-all duration-200 sm:min-h-[8.25rem] sm:px-6 sm:py-5",
                  idx === 0 && "border-r border-border",
                  active ? "bg-primary/[0.05]" : "hover:bg-muted/25",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-primary" aria-hidden />
                )}
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                    active ? "border-primary bg-primary" : "border-border bg-transparent",
                  )}
                >
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" aria-hidden />
                  )}
                </span>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <span
                    className={cn(
                      "block text-[1.05rem] font-normal italic leading-snug transition-colors duration-200 sm:text-[1.15rem]",
                      active ? "text-foreground" : "text-muted-foreground/70",
                    )}
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {val === "yes" ? "Joyfully accept" : "Regretfully decline"}
                  </span>
                  <span
                    className={cn(
                      "block text-[10px] tracking-[0.16em] uppercase transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground/55",
                    )}
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {val === "yes" ? "Yes, I'll be there" : "I can't make it"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {attendance === "yes" && (
        <FieldGroup
          label="Party size"
          hint={
            <>
              Max <span className="font-medium text-foreground">2 guests</span> per invitation.
            </>
          }
        >
          <Select value={pax} onValueChange={setPax} disabled={pending}>
            <SelectTrigger id="rsvp-pax" className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-none border-border">
              {[1, 2].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-sm font-light">
                  {n} {n === 1 ? "person" : "people"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
      )}

      {attendance === "no" && (
        <div className="w-full border border-border/80 bg-secondary/20 px-6 py-6 sm:px-7 sm:py-7">
          <p
            className="whitespace-pre-line text-[15px] font-light leading-relaxed text-foreground/90"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {giftInfo?.trim()
              ? giftInfo.trim()
              : "You will be missed. If you'd like to send a gift, we would be truly touched."}
          </p>

          {bankAccount ? (
            <div className="mt-6 space-y-3 border-t border-border/70 pt-6">
              <p
                className="text-[11px] font-medium tracking-[0.26em] uppercase text-foreground/65"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Bank transfer
              </p>
              <p className="break-all font-mono text-base leading-relaxed tracking-wide text-foreground sm:text-[17px]">
                {bankAccount}
              </p>
              {bankName && (
                <p className="text-[13px] font-light leading-relaxed text-muted-foreground">
                  {bankName}
                </p>
              )}
              {bankHolder && (
                <p className="text-[13px] font-light leading-relaxed text-muted-foreground/75">
                  {bankHolder}
                </p>
              )}
              <button
                type="button"
                onClick={copyAccount}
                className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-primary/75 transition-colors hover:text-primary"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                {copied ? "Copied" : "Copy account number"}
              </button>
            </div>
          ) : (
            <p className="mt-5 text-[12px] font-light leading-relaxed text-muted-foreground/70">
              Reach out to us directly and we&apos;ll share our details.
            </p>
          )}
        </div>
      )}

      <FieldGroup label="A note for us (optional)">
        <Textarea
          id="rsvp-message"
          name="message"
          rows={4}
          disabled={pending}
          className={textareaClass}
        />
      </FieldGroup>

      <div className="w-full pt-1">
        <button
          type="submit"
          disabled={pending || submitted}
          className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-full border border-primary px-8 text-[11px] tracking-[0.22em] uppercase text-primary transition-colors duration-300 hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          <span
            className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
            aria-hidden
          />
          <span className="relative flex items-center justify-center gap-2">
            {pending ? (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
                Sending…
              </>
            ) : submitted ? (
              "Response sent"
            ) : (
              "Send my response"
            )}
          </span>
        </button>
      </div>
      </form>
    </>
  );
}
