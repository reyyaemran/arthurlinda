"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Heart,
  MapPin,
  CalendarDays,
  BookOpen,
  Globe,
  CreditCard,
  Plus,
  Trash2,
  Type,
  Hotel,
  ArrowUp,
  ArrowDown,
  ImagePlus,
} from "lucide-react";

import { DatePicker } from "@/components/shared/date-picker";
import type { PublicWeddingPayload } from "@/lib/wedding/queries";
import type { LandingAccommodation, ResolvedLandingContent, StorySlide } from "@/lib/wedding/landing-content";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DASHBOARD_CURRENCY_OPTIONS,
  getDashboardCurrencySymbol,
  isPresetDashboardCurrency,
} from "@/lib/wedding/currency-options";
import { cn } from "@/lib/utils";
import {
  formInputClass as inputClass,
  formTextareaClass as textareaClass,
  FormFieldLabel as FieldLabel,
  FormCollapsibleSection as Section,
  SettingsFillButton,
} from "../settings/settings-form-primitives";
import { utcIsoToWallDatetimeLocal, wallLocalToUtcDate } from "@/lib/datetime/wall-in-timezone";

export const WEDDING_SETTINGS_FORM_ID = "wedding-settings-form";

const TIMEZONE_OPTIONS = [
  "Asia/Phnom_Penh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Ho_Chi_Minh",
  "Asia/Jakarta",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const WEDDING_DATE_PICKER_FROM = new Date(1990, 0, 1);
const WEDDING_DATE_PICKER_TO = new Date(2040, 11, 31);

function parseLocalDateFromIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Editable row for landing “When” timeline (stored as `WeddingEvent`). */
type LandingScheduleDraft = {
  key: string;
  id?: string;
  title: string;
  description: string;
  location: string;
  startIso: string;
  endIso: string | null;
};

function eventsToDrafts(events: PublicWeddingPayload["events"]): LandingScheduleDraft[] {
  return [...events]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => ({
      key: e.id,
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      location: e.location ?? "",
      startIso: e.startTime,
      endIso: e.endTime ?? null,
    }));
}

function newScheduleRowKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultSlotIso(eventDateIso: string, tz: string, hour: number, min: number): string {
  const day = utcIsoToWallDatetimeLocal(eventDateIso, tz).slice(0, 10);
  const wall = `${day}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  return wallLocalToUtcDate(wall, tz).toISOString();
}

/** Wall date (YYYY-MM-DD) and time (HH:mm) in `timeZone` from a UTC ISO instant. */
function wallDateAndTimeFromIso(iso: string, timeZone: string): { date: string; time: string } {
  const s = utcIsoToWallDatetimeLocal(iso, timeZone);
  if (!s) return { date: "", time: "00:00" };
  return { date: s.slice(0, 10), time: s.slice(11, 16) };
}

/** Parse YYYY-MM-DD as a local calendar `Date` (same idea as hero wedding date). */
function parseWallYmd(ymd: string): Date | undefined {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Accepts "9:30", "09:30", "930" → canonical "HH:mm", or null if invalid / empty. */
function parseAndFormatHm(s: string): string | null {
  const t = s.replace(/\s/g, "").replace(".", ":");
  if (!t) return null;
  let h: number;
  let min: number;
  if (/^\d{1,2}:\d{1,2}$/.test(t)) {
    const [a, b] = t.split(":");
    h = Number(a);
    min = Number(b!);
  } else if (/^\d{3,4}$/.test(t)) {
    if (t.length === 3) {
      h = Number(t[0]);
      min = Number(t.slice(1));
    } else {
      h = Number(t.slice(0, 2));
      min = Number(t.slice(2));
    }
  } else {
    return null;
  }
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function ScheduleTimeField({
  value,
  onCommit,
  optional,
  className,
  placeholder = "HH:MM",
}: {
  value: string;
  onCommit: (canonical: string | null) => void;
  optional?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const trimmed = text.trim();
        if (!trimmed) {
          if (optional) {
            onCommit(null);
            setText("");
          } else {
            setText(value);
          }
          return;
        }
        const c = parseAndFormatHm(trimmed);
        if (c) {
          onCommit(c);
          setText(c);
        } else {
          setText(value);
        }
      }}
      className={className}
    />
  );
}

export function SettingsWeddingPage({
  data,
  onSavingChange,
}: {
  data: PublicWeddingPayload;
  onSavingChange?: (saving: boolean) => void;
}) {
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(data.currency);
  const [timezone, setTimezone] = useState(data.timezone);
  const [landing, setLanding] = useState<ResolvedLandingContent>(() => ({ ...data.landing }));
  const [weddingDate, setWeddingDate] = useState(() => parseLocalDateFromIso(data.eventDate));
  const [scheduleDraft, setScheduleDraft] = useState<LandingScheduleDraft[]>(() =>
    eventsToDrafts(data.events),
  );
  const [storyUploadIdx, setStoryUploadIdx] = useState<number | null>(null);
  const router = useRouter();

  const eventsSyncKey = useMemo(
    () =>
      data.events
        .map(
          (e) =>
            `${e.id}:${e.startTime}:${e.endTime ?? ""}:${e.title}:${e.sortOrder}:${e.location ?? ""}`,
        )
        .join("|"),
    [data.events],
  );

  useEffect(() => {
    setScheduleDraft(eventsToDrafts(data.events));
    // eventsSyncKey is a content hash of data.events; using it keeps the
    // effect from re-firing on unrelated parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsSyncKey]);

  const landingSync = JSON.stringify(data.landing);
  useEffect(() => {
    setLanding(JSON.parse(landingSync) as ResolvedLandingContent);
  }, [landingSync]);

  useEffect(() => {
    setWeddingDate(parseLocalDateFromIso(data.eventDate));
  }, [data.eventDate]);

  useEffect(() => {
    setCurrency(data.currency);
    setTimezone(data.timezone);
  }, [data.currency, data.timezone]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    onSavingChange?.(loading);
  }, [loading, onSavingChange]);

  const currencyCode = (currency.trim().toUpperCase().slice(0, 3) || "USD") as string;
  const currencyMenuOptions = useMemo(() => {
    if (isPresetDashboardCurrency(currencyCode)) {
      return DASHBOARD_CURRENCY_OPTIONS;
    }
    return [
      { code: currencyCode, label: `Saved code (${currencyCode})` },
      ...DASHBOARD_CURRENCY_OPTIONS,
    ];
  }, [currencyCode]);

  const updateSlide = (index: number, patch: Partial<StorySlide>) => {
    setLanding((prev) => {
      const storySlides = prev.storySlides.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, storySlides };
    });
  };

  const addSlide = () => {
    setLanding((prev) => ({
      ...prev,
      storySlides: [...prev.storySlides, { title: "New chapter", text: "Tell your story here." }],
    }));
  };

  const removeSlide = (index: number) => {
    setLanding((prev) => ({
      ...prev,
      storySlides: prev.storySlides.filter((_, i) => i !== index),
    }));
  };

  const uploadStorySlideImage = async (index: number, file: File | undefined) => {
    if (!file) return;
    setStoryUploadIdx(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/wedding/story-image", { method: "POST", body: fd });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(typeof body.error === "string" ? body.error : "Upload failed");
        return;
      }
      if (body.url) {
        updateSlide(index, { imageUrl: body.url });
        toast.success("Photo uploaded — save all to publish on the site");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setStoryUploadIdx(null);
    }
  };

  const updateHotel = (index: number, patch: Partial<LandingAccommodation>) => {
    setLanding((prev) => {
      const accommodations = prev.accommodations.map((a, i) => (i === index ? { ...a, ...patch } : a));
      return { ...prev, accommodations };
    });
  };

  const addHotel = () => {
    setLanding((prev) => ({
      ...prev,
      accommodations: [
        ...prev.accommodations,
        {
          name: "Hotel name",
          category: "Category",
          description: "Short description for guests.",
          distance: "— km from venue",
          bookingUrl: "",
        },
      ],
    }));
  };

  const removeHotel = (index: number) => {
    setLanding((prev) => ({
      ...prev,
      accommodations: prev.accommodations.filter((_, i) => i !== index),
    }));
  };

  const patchScheduleRow = (key: string, patch: Partial<LandingScheduleDraft>) => {
    setScheduleDraft((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addScheduleRow = () => {
    const tz = timezone.trim() || "Asia/Phnom_Penh";
    setScheduleDraft((prev) => [
      ...prev,
      {
        key: newScheduleRowKey(),
        title: "New event",
        description: "",
        location: "",
        startIso: defaultSlotIso(data.eventDate, tz, 10, 0),
        endIso: defaultSlotIso(data.eventDate, tz, 11, 0),
      },
    ]);
  };

  const removeScheduleRow = (key: string) => {
    setScheduleDraft((prev) => prev.filter((r) => r.key !== key));
  };

  const moveScheduleRow = (key: string, dir: -1 | 1) => {
    setScheduleDraft((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (landing.storySlides.length < 1) {
      toast.error("Add at least one story slide.");
      return;
    }
    if (landing.accommodations.length < 1) {
      toast.error("Add at least one accommodation (or a placeholder).");
      return;
    }
    if (scheduleDraft.length < 1) {
      toast.error("Add at least one schedule item for the invitation timeline.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/wedding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groomName: fd.get("groomName"),
          brideName: fd.get("brideName"),
          groomFullName: fd.get("groomFullName") || undefined,
          brideFullName: fd.get("brideFullName") || undefined,
          groomParents: fd.get("groomParents") || undefined,
          brideParents: fd.get("brideParents") || undefined,
          eventDate: fd.get("eventDate"),
          slug: fd.get("slug"),
          venueName: fd.get("venueName") || undefined,
          venueAddress: fd.get("venueAddress") || undefined,
          venueMapUrl: fd.get("venueMapUrl") || undefined,
          quoteText: fd.get("quoteText") || undefined,
          quoteSource: fd.get("quoteSource") || undefined,
          giftInfo: fd.get("giftInfo") || undefined,
          bankName: fd.get("bankName") || undefined,
          bankAccount: fd.get("bankAccount") || undefined,
          bankHolder: fd.get("bankHolder") || undefined,
          currency: currency.trim().toUpperCase() || "USD",
          timezone: timezone.trim() || "Asia/Phnom_Penh",
          landingOverrides: landing,
          scheduleEvents: scheduleDraft.map((r, i) => ({
            ...(r.id ? { id: r.id } : {}),
            title: r.title.trim() || "Event",
            description: r.description.trim() || undefined,
            startTime: r.startIso,
            endTime: r.endIso ?? undefined,
            location: r.location.trim() || undefined,
            sortOrder: i,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: unknown };
        const msg = formatWeddingApiError(body.error);
        toast.error(msg);
        return;
      }
      toast.success("Invitation updated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /** Single-tenant: invitation lives at the site root, not `/wedding/[slug]`. */
  const inviteUrl = origin ? `${origin.replace(/\/$/, "")}/` : "/";

  return (
    <form id={WEDDING_SETTINGS_FORM_ID} onSubmit={handleSubmit}>
      <div className="flex flex-col gap-6">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <Section id="s-hero" icon={<Heart className="h-4 w-4" />} label="Hero — couple & date" defaultOpen>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8">
              <div>
                <FieldLabel>Hero line (above names)</FieldLabel>
                <Input
                  value={landing.heroEyebrow}
                  onChange={(e) => setLanding((p) => ({ ...p, heroEyebrow: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Cherish the Moments"
                />
              </div>
              <div className="hidden sm:block" aria-hidden />
              <div>
                <FieldLabel>Groom name</FieldLabel>
                <Input name="groomName" defaultValue={data.groomName} required className={inputClass} />
              </div>
              <div>
                <FieldLabel>Bride name</FieldLabel>
                <Input name="brideName" defaultValue={data.brideName} required className={inputClass} />
              </div>
              <div>
                <FieldLabel>Groom full name</FieldLabel>
                <Input name="groomFullName" defaultValue={data.groomFullName ?? ""} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Bride full name</FieldLabel>
                <Input name="brideFullName" defaultValue={data.brideFullName ?? ""} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Groom&apos;s parents</FieldLabel>
                <Input
                  name="groomParents"
                  defaultValue={data.groomParents ?? ""}
                  className={inputClass}
                  placeholder="e.g. Mr & Mrs Smith"
                />
              </div>
              <div>
                <FieldLabel>Bride&apos;s parents</FieldLabel>
                <Input
                  name="brideParents"
                  defaultValue={data.brideParents ?? ""}
                  className={inputClass}
                  placeholder="e.g. Mr & Mrs Tan"
                />
              </div>
              <div>
                <FieldLabel>Wedding date</FieldLabel>
                <DatePicker
                  date={weddingDate}
                  setDate={(d) => {
                    if (d) setWeddingDate(d);
                  }}
                  displayFormat="EEEE, MMMM d, yyyy"
                  displayClassName="[font-family:var(--font-playfair)] text-[15px] font-light text-foreground"
                  triggerClassName={cn(
                    inputClass,
                    "flex w-full items-center justify-between gap-2 text-left font-light outline-none focus-visible:border-primary",
                  )}
                  iconTrailing
                  hiddenInputName="eventDate"
                  hiddenInputRequired
                  popoverContentClassName="rounded-xl border border-border/80 bg-popover p-0 shadow-lg"
                  calendarProps={{
                    captionLayout: "dropdown",
                    defaultMonth: weddingDate,
                    fromDate: WEDDING_DATE_PICKER_FROM,
                    toDate: WEDDING_DATE_PICKER_TO,
                  }}
                />
              </div>
              <div>
                <FieldLabel>Display timezone</FieldLabel>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={cn(
                    inputClass,
                    "w-full cursor-pointer appearance-none bg-transparent pr-6",
                  )}
                >
                  {(TIMEZONE_OPTIONS.includes(timezone) ? TIMEZONE_OPTIONS : [timezone, ...TIMEZONE_OPTIONS]).map(
                    (tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")}
                      </option>
                    ),
                  )}
                </select>
                <p className="mt-2 text-[11px] font-light text-muted-foreground/60">
                  Used for times on the invitation and countdown.
                </p>
              </div>
              <div>
                <FieldLabel>Dashboard currency</FieldLabel>
                <Select
                  value={currencyCode}
                  onValueChange={(code) => setCurrency(code)}
                >
                  <SelectTrigger
                    className={cn(
                      inputClass,
                      "w-full justify-between gap-2 pr-1 [&>svg]:shrink-0 [&>svg]:opacity-40",
                    )}
                    aria-label="Dashboard currency"
                  >
                    <SelectValue placeholder="Choose currency" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="max-h-[min(22rem,var(--radix-select-content-available-height))] w-[min(100vw-2rem,20rem)] rounded-lg border-border/80"
                  >
                    {currencyMenuOptions.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="py-2 pl-2">
                        <span className="flex w-full min-w-0 items-center gap-2.5">
                          <span
                            className="flex h-8 min-w-8 max-w-[5rem] shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 px-1.5 text-center text-[12px] font-semibold leading-none tabular-nums text-foreground/90"
                            aria-hidden
                          >
                            <span className="truncate">{getDashboardCurrencySymbol(c.code)}</span>
                          </span>
                          <span className="font-mono text-[13px] font-medium tabular-nums">{c.code}</span>
                          <span className="truncate text-[12px] font-light text-muted-foreground">
                            {c.label}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-2 text-[11px] font-light text-muted-foreground/60">
                  Budget and overview amounts use this symbol and format.
                </p>
              </div>
            </div>
          </Section>

          <Section id="s-when" icon={<CalendarDays className="h-4 w-4" />} label="When — schedule">
            <div className="space-y-6">
              {scheduleDraft.map((row, index) => (
                <div
                  key={row.key}
                  className="space-y-4 border-b border-border/50 pb-6 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold tracking-[0.2em] text-foreground sm:text-sm">
                      ITEM {index + 1}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground"
                        onClick={() => moveScheduleRow(row.key, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-muted-foreground"
                        onClick={() => moveScheduleRow(row.key, 1)}
                        disabled={index === scheduleDraft.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-full text-destructive/70 hover:text-destructive"
                        onClick={() => removeScheduleRow(row.key)}
                        disabled={scheduleDraft.length <= 1}
                        aria-label="Remove schedule item"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Title</FieldLabel>
                    <Input
                      value={row.title}
                      onChange={(e) => patchScheduleRow(row.key, { title: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. Morning ceremony"
                    />
                  </div>
                  <div>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      value={row.location}
                      onChange={(e) => patchScheduleRow(row.key, { location: e.target.value })}
                      className={inputClass}
                      placeholder="Shown on the invitation timeline"
                    />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      value={row.description}
                      onChange={(e) => patchScheduleRow(row.key, { description: e.target.value })}
                      className={textareaClass}
                      rows={2}
                      placeholder="Notes (not shown on the current invitation layout)"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                    <div>
                      <FieldLabel>Date</FieldLabel>
                      <DatePicker
                        date={parseWallYmd(wallDateAndTimeFromIso(row.startIso, timezone).date)}
                        setDate={(next) => {
                          if (!next) return;
                          const d = format(next, "yyyy-MM-dd");
                          const startT = wallDateAndTimeFromIso(row.startIso, timezone).time;
                          try {
                            const startIso = wallLocalToUtcDate(
                              `${d}T${startT}`,
                              timezone,
                            ).toISOString();
                            let endIso = row.endIso;
                            if (row.endIso) {
                              const endT = wallDateAndTimeFromIso(row.endIso, timezone).time;
                              endIso = wallLocalToUtcDate(`${d}T${endT}`, timezone).toISOString();
                            }
                            patchScheduleRow(row.key, { startIso, endIso });
                          } catch {
                            /* invalid */
                          }
                        }}
                        displayFormat="MMM d, yyyy"
                        triggerClassName={cn(
                          inputClass,
                          "flex w-full items-center justify-between gap-2 text-left font-light outline-none focus-visible:border-primary",
                        )}
                        iconTrailing
                        popoverContentClassName="rounded-xl border border-border/80 bg-popover p-0 shadow-lg"
                        calendarProps={{
                          captionLayout: "dropdown",
                          defaultMonth:
                            parseWallYmd(wallDateAndTimeFromIso(row.startIso, timezone).date) ??
                            undefined,
                          fromDate: WEDDING_DATE_PICKER_FROM,
                          toDate: WEDDING_DATE_PICKER_TO,
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Start time</FieldLabel>
                      <ScheduleTimeField
                        value={wallDateAndTimeFromIso(row.startIso, timezone).time}
                        onCommit={(t) => {
                          if (!t) return;
                          const { date } = wallDateAndTimeFromIso(row.startIso, timezone);
                          if (!date) return;
                          try {
                            patchScheduleRow(row.key, {
                              startIso: wallLocalToUtcDate(`${date}T${t}`, timezone).toISOString(),
                            });
                          } catch {
                            /* invalid */
                          }
                        }}
                        className={cn(inputClass, "w-full font-mono tabular-nums")}
                      />
                    </div>
                    <div>
                      <FieldLabel>End time</FieldLabel>
                      <ScheduleTimeField
                        optional
                        value={
                          row.endIso
                            ? wallDateAndTimeFromIso(row.endIso, timezone).time
                            : ""
                        }
                        onCommit={(t) => {
                          const { date } = wallDateAndTimeFromIso(row.startIso, timezone);
                          if (!date) return;
                          if (!t) {
                            patchScheduleRow(row.key, { endIso: null });
                            return;
                          }
                          try {
                            patchScheduleRow(row.key, {
                              endIso: wallLocalToUtcDate(`${date}T${t}`, timezone).toISOString(),
                            });
                          } catch {
                            /* invalid */
                          }
                        }}
                        className={cn(inputClass, "w-full font-mono tabular-nums")}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-dashed text-xs"
                onClick={addScheduleRow}
              >
                <Plus className="mr-1.5 size-3.5" />
                Add schedule item
              </Button>
            </div>
          </Section>

          <Section id="s-where" icon={<MapPin className="h-4 w-4" />} label="Where — venue">
            <div className="space-y-6">
              <div>
                <FieldLabel>Venue name</FieldLabel>
                <Input
                  name="venueName"
                  defaultValue={data.venueName ?? ""}
                  className={inputClass}
                  placeholder="e.g. Angkor Grace Resort"
                />
              </div>
              <div>
                <FieldLabel>Address</FieldLabel>
                <Input
                  name="venueAddress"
                  defaultValue={data.venueAddress ?? ""}
                  className={inputClass}
                  placeholder="Street, City, Country"
                />
              </div>
              <div>
                <FieldLabel>Google Maps link</FieldLabel>
                <Input
                  name="venueMapUrl"
                  defaultValue={data.venueMapUrl ?? ""}
                  className={inputClass}
                  placeholder="https://maps.google.com/…"
                />
              </div>
            </div>
          </Section>

          <Section id="s-story" icon={<BookOpen className="h-4 w-4" />} label="Story — horizontal gallery">
            <div className="space-y-6">
              <div>
                <FieldLabel>Section title</FieldLabel>
                <Input
                  value={landing.storySectionLabel}
                  onChange={(e) => setLanding((p) => ({ ...p, storySectionLabel: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-6">
                {landing.storySlides.map((slide, idx) => (
                  <div
                    key={idx}
                    className="relative border border-border/60 bg-muted/20 p-4 pt-6"
                  >
                    <span className="absolute left-3 top-0 -translate-y-1/2 bg-card px-2 text-[9px] tracking-[0.2em] text-muted-foreground">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Title</FieldLabel>
                        <Input
                          value={slide.title}
                          onChange={(e) => updateSlide(idx, { title: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex items-end justify-end pb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-destructive hover:text-destructive"
                          disabled={landing.storySlides.length <= 1}
                          onClick={() => removeSlide(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <FieldLabel>Text</FieldLabel>
                      <Textarea
                        value={slide.text}
                        onChange={(e) => updateSlide(idx, { text: e.target.value })}
                        rows={3}
                        className={textareaClass}
                      />
                    </div>
                    <div className="mt-4">
                      <FieldLabel>Photo</FieldLabel>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <div className="relative aspect-[4/3] w-full max-w-[280px] shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30">
                          {slide.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin preview of user upload
                            <img
                              src={slide.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex min-h-[120px] items-center justify-center px-4 text-center text-[11px] text-muted-foreground">
                              No photo yet
                            </div>
                          )}
                          {storyUploadIdx === idx ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-medium text-foreground">
                              Uploading…
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            id={`story-slide-photo-${idx}`}
                            disabled={storyUploadIdx !== null}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              void uploadStorySlideImage(idx, f);
                              e.target.value = "";
                            }}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs"
                              disabled={storyUploadIdx !== null}
                              asChild
                            >
                              <label htmlFor={`story-slide-photo-${idx}`} className="cursor-pointer">
                                <ImagePlus className="mr-1.5 size-3.5" />
                                {slide.imageUrl ? "Replace photo" : "Upload photo"}
                              </label>
                            </Button>
                            {slide.imageUrl ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs text-destructive hover:text-destructive"
                                disabled={storyUploadIdx !== null}
                                onClick={() => updateSlide(idx, { imageUrl: undefined })}
                              >
                                Remove photo
                              </Button>
                            ) : null}
                          </div>
                          <p className="text-[10px] font-light text-muted-foreground/70">
                            JPEG, PNG, WebP, or GIF · max 4MB
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="gap-1 rounded-full" onClick={addSlide}>
                  <Plus className="h-3.5 w-3.5" />
                  Add slide
                </Button>
              </div>
            </div>
          </Section>

          <Section id="s-quote" icon={<Type className="h-4 w-4" />} label="Words — quote block">
            <div className="space-y-6">
              <div>
                <FieldLabel>Quote / verse</FieldLabel>
                <Textarea
                  name="quoteText"
                  defaultValue={data.quoteText ?? ""}
                  rows={3}
                  className={textareaClass}
                  placeholder="Shown as a centered quote between story and when/where…"
                />
              </div>
              <div>
                <FieldLabel>Source</FieldLabel>
                <Input name="quoteSource" defaultValue={data.quoteSource ?? ""} className={inputClass} />
              </div>
            </div>
          </Section>

          <Section id="s-rsvp" icon={<CreditCard className="h-4 w-4" />} label="RSVP — copy & bank">
            <div className="space-y-6">
              <div>
                <FieldLabel>RSVP headline</FieldLabel>
                <Textarea
                  value={landing.rsvpHeadline}
                  onChange={(e) => setLanding((p) => ({ ...p, rsvpHeadline: e.target.value }))}
                  rows={2}
                  className={textareaClass}
                  placeholder="Use a new line for a second line"
                />
                <p className="mt-2 text-[11px] font-light text-muted-foreground/60">
                  Line breaks appear on the invitation.
                </p>
              </div>
              <div>
                <FieldLabel>RSVP supporting text</FieldLabel>
                <Textarea
                  value={landing.rsvpBody}
                  onChange={(e) => setLanding((p) => ({ ...p, rsvpBody: e.target.value }))}
                  rows={3}
                  className={textareaClass}
                />
              </div>
              <div>
                <FieldLabel>Decline / gift message</FieldLabel>
                <Textarea
                  name="giftInfo"
                  defaultValue={data.giftInfo ?? ""}
                  rows={2}
                  className={textareaClass}
                  placeholder="Shown when someone declines (above bank details, if set)"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-x-6">
                <div>
                  <FieldLabel>Bank</FieldLabel>
                  <Input name="bankName" defaultValue={data.bankName ?? ""} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Account no.</FieldLabel>
                  <Input name="bankAccount" defaultValue={data.bankAccount ?? ""} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Account holder</FieldLabel>
                  <Input name="bankHolder" defaultValue={data.bankHolder ?? ""} className={inputClass} />
                </div>
              </div>
            </div>
          </Section>

          <Section id="s-stay" icon={<Hotel className="h-4 w-4" />} label="Stay — accommodation grid">
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <FieldLabel>Section title</FieldLabel>
                  <Input
                    value={landing.stayTitle}
                    onChange={(e) => setLanding((p) => ({ ...p, stayTitle: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Subtitle</FieldLabel>
                  <Input
                    value={landing.staySubtitle}
                    onChange={(e) => setLanding((p) => ({ ...p, staySubtitle: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-6">
                <div className="max-h-[34rem] space-y-6 overflow-y-auto pr-1 sm:max-h-[38rem]">
                  {landing.accommodations.map((hotel, idx) => (
                    <div key={idx} className="space-y-4 border border-border/60 bg-muted/15 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] tracking-[0.2em] text-muted-foreground">Hotel {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-destructive hover:text-destructive"
                          disabled={landing.accommodations.length <= 1}
                          onClick={() => removeHotel(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Name</FieldLabel>
                          <Input
                            value={hotel.name}
                            onChange={(e) => updateHotel(idx, { name: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Category</FieldLabel>
                          <Input
                            value={hotel.category}
                            onChange={(e) => updateHotel(idx, { category: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Description</FieldLabel>
                        <Textarea
                          value={hotel.description}
                          onChange={(e) => updateHotel(idx, { description: e.target.value })}
                          rows={2}
                          className={textareaClass}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Distance note</FieldLabel>
                          <Input
                            value={hotel.distance}
                            onChange={(e) => updateHotel(idx, { distance: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Booking URL</FieldLabel>
                          <Input
                            value={hotel.bookingUrl}
                            onChange={(e) => updateHotel(idx, { bookingUrl: e.target.value })}
                            className={inputClass}
                            placeholder="https://…"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1 rounded-full" onClick={addHotel}>
                  <Plus className="h-3.5 w-3.5" />
                  Add hotel
                </Button>
              </div>
            </div>
          </Section>

          <Section id="s-link" icon={<Globe className="h-4 w-4" />} label="Invitation link">
            <input type="hidden" name="slug" key={data.slug} defaultValue={data.slug} />
            <div className="space-y-4">
              <p className="text-[11px] font-light leading-relaxed text-muted-foreground/70">
                This app hosts one invitation per site. Guests use your homepage — no path or slug in the link.
              </p>
              <div>
                <FieldLabel>Share link</FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <Input
                    readOnly
                    value={inviteUrl}
                    className={cn(inputClass, "flex-1 select-all font-mono text-[12px]")}
                  />
                  <SettingsFillButton
                    type="button"
                    className="h-9 shrink-0 px-5 text-[11px] tracking-[0.2em]"
                    onClick={() => {
                      const toCopy =
                        inviteUrl === "/" ? inviteUrl : inviteUrl.replace(/\/$/, "");
                      void navigator.clipboard
                        .writeText(toCopy)
                        .then(() => toast.success("Link copied"))
                        .catch(() => toast.error("Could not copy"));
                    }}
                  >
                    Copy
                  </SettingsFillButton>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </form>
  );
}

function formatWeddingApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "Failed to save";
  const rec = error as Record<string, unknown>;
  const firstArr = Object.values(rec).find((v) => Array.isArray(v) && typeof v[0] === "string") as
    | string[]
    | undefined;
  if (firstArr?.[0]) return firstArr[0];
  const nested = rec.fieldErrors as Record<string, string[]> | undefined;
  if (nested) {
    const msg = Object.values(nested).flat()[0];
    if (msg) return msg;
  }
  return "Failed to save";
}
