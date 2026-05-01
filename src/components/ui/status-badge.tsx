"use client";

import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Circle,
  Loader2,
  User,
  Users,
  Heart,
  Crown,
  Briefcase,
  HelpCircle,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "success" | "warning" | "info";

/** Shared frame — matches RSVP glass pills */
const GLASS_PILL_BASE =
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extralight tracking-[0.06em] text-foreground/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md transition-[background-color,border-color,box-shadow] dark:text-foreground/78 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

/** App palette tints (globals.css) */
const GLASS = {
  matcha:
    "border border-[#455026]/22 bg-[#455026]/[0.08] dark:border-[#455026]/42 dark:bg-[#455026]/[0.22]",
  terra:
    "border border-[#c45a1a]/26 bg-[#c45a1a]/[0.09] dark:border-[#e88b4a]/38 dark:bg-[#e88b4a]/[0.14]",
  destructive:
    "border border-[#c93434]/24 bg-[#c93434]/[0.07] dark:border-[#f08080]/34 dark:bg-[#c93434]/[0.18]",
  sage:
    "border border-[#6b7652]/22 bg-[#6b7652]/[0.07] dark:border-[#6b7652]/40 dark:bg-[#6b7652]/[0.18]",
  neutral:
    "border border-[#e0dbd0]/80 bg-[#f0ece3]/60 dark:border-white/[0.1] dark:bg-white/[0.06]",
  neutralSoft:
    "border border-border/40 bg-muted/35 dark:border-white/[0.08] dark:bg-white/[0.05]",
} as const;

type GlassStyle = { shell: string; icon: string };

const paymentConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  PAID: { label: "Paid", variant: "success", icon: CheckCircle2 },
  PARTIAL: { label: "Partial", variant: "warning", icon: Clock },
  UNPAID: { label: "Unpaid", variant: "warning", icon: XCircle },
  OVERDUE: { label: "Overdue", variant: "destructive", icon: AlertCircle },
};

const paymentGlassClass: Record<string, GlassStyle> = {
  PAID: {
    shell: cn(GLASS_PILL_BASE, GLASS.matcha),
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  PARTIAL: {
    shell: cn(GLASS_PILL_BASE, GLASS.terra),
    icon: "text-amber-600 dark:text-amber-400",
  },
  UNPAID: {
    shell: cn(GLASS_PILL_BASE, GLASS.terra),
    icon: "text-amber-600 dark:text-amber-400",
  },
  OVERDUE: {
    shell: cn(GLASS_PILL_BASE, GLASS.destructive),
    icon: "text-red-600 dark:text-red-400",
  },
};

const rsvpConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  CONFIRMED: { label: "Confirmed", variant: "success", icon: Check },
  PENDING: { label: "Pending", variant: "warning", icon: Clock },
  DECLINED: { label: "Declined", variant: "destructive", icon: X },
};

const rsvpGlassClass: Record<string, GlassStyle> = {
  CONFIRMED: {
    shell: cn(GLASS_PILL_BASE, GLASS.matcha),
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  PENDING: {
    shell: cn(GLASS_PILL_BASE, GLASS.terra),
    icon: "text-amber-600 dark:text-amber-400",
  },
  DECLINED: {
    shell: cn(GLASS_PILL_BASE, GLASS.destructive),
    icon: "text-red-600 dark:text-red-400",
  },
};

const taskStatusConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  TODO: { label: "To do", variant: "outline", icon: Circle },
  IN_PROGRESS: { label: "In progress", variant: "info", icon: Loader2 },
  DONE: { label: "Done", variant: "success", icon: CheckCircle2 },
};

const taskGlassClass: Record<string, GlassStyle> = {
  TODO: {
    shell: cn(GLASS_PILL_BASE, GLASS.neutral),
    icon: "text-muted-foreground",
  },
  IN_PROGRESS: {
    shell: cn(GLASS_PILL_BASE, GLASS.terra),
    icon: "text-sky-600 dark:text-sky-400",
  },
  DONE: {
    shell: cn(GLASS_PILL_BASE, GLASS.matcha),
    icon: "text-emerald-600 dark:text-emerald-400",
  },
};

const categoryConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  FAMILY: { label: "Family", variant: "secondary", icon: Users },
  RELATIVE: { label: "Relative", variant: "secondary", icon: Heart },
  FRIEND: { label: "Friend", variant: "secondary", icon: User },
  VIP: { label: "VIP", variant: "secondary", icon: Crown },
  COLLEAGUE: { label: "Colleague", variant: "secondary", icon: Briefcase },
  OTHER: { label: "Other", variant: "secondary", icon: HelpCircle },
};

const categoryGlassClass: Record<string, GlassStyle> = {
  FAMILY: {
    shell: cn(GLASS_PILL_BASE, GLASS.matcha),
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  RELATIVE: {
    shell: cn(GLASS_PILL_BASE, GLASS.sage),
    icon: "text-emerald-700 dark:text-emerald-400",
  },
  FRIEND: {
    shell: cn(GLASS_PILL_BASE, GLASS.sage),
    icon: "text-emerald-700 dark:text-emerald-400",
  },
  VIP: {
    shell: cn(GLASS_PILL_BASE, GLASS.terra),
    icon: "text-amber-600 dark:text-amber-400",
  },
  COLLEAGUE: {
    shell: cn(GLASS_PILL_BASE, GLASS.neutral),
    icon: "text-muted-foreground",
  },
  OTHER: {
    shell: cn(GLASS_PILL_BASE, GLASS.neutralSoft),
    icon: "text-muted-foreground/80",
  },
};

type StatusBadgeType = "payment" | "rsvp" | "task" | "category" | "housekeeping";

const housekeepingConfig: Record<
  string,
  { label: string; variant: BadgeVariant; icon: LucideIcon }
> = {
  clean: { label: "Clean", variant: "success", icon: CheckCircle2 },
  dirty: { label: "Dirty", variant: "destructive", icon: XCircle },
  "in-progress": { label: "In progress", variant: "warning", icon: Loader2 },
};

const housekeepingGlassClass: Record<string, GlassStyle> = {
  clean: {
    shell: cn(GLASS_PILL_BASE, GLASS.matcha),
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  dirty: {
    shell: cn(GLASS_PILL_BASE, GLASS.destructive),
    icon: "text-red-600 dark:text-red-400",
  },
  "in-progress": {
    shell: cn(GLASS_PILL_BASE, GLASS.terra),
    icon: "text-amber-600 dark:text-amber-400",
  },
};

interface StatusBadgeProps {
  type: StatusBadgeType;
  value: string;
  className?: string;
}

function GlassPill({
  glass,
  Icon,
  label,
  spinIcon,
  className,
}: {
  glass: GlassStyle;
  Icon: LucideIcon;
  label: string;
  spinIcon?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(glass.shell, className)}>
      <Icon
        className={cn("h-3 w-3 shrink-0", glass.icon, spinIcon && "animate-spin")}
        aria-hidden="true"
        strokeWidth={2.5}
      />
      {label}
    </span>
  );
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  const key = value.toUpperCase().replace(/\s+/g, "_");

  let config: { label: string; variant: BadgeVariant; icon: LucideIcon } | undefined;

  if (type === "payment") config = paymentConfig[key];
  else if (type === "rsvp") config = rsvpConfig[key];
  else if (type === "task") config = taskStatusConfig[key];
  else if (type === "category") config = categoryConfig[key];
  else if (type === "housekeeping") {
    const hkNorm = value.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
    const hkResolved = hkNorm === "in-progress" ? "in-progress" : hkNorm;
    config =
      housekeepingConfig[hkResolved] ?? housekeepingConfig["in-progress"];
  }

  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {value}
      </Badge>
    );
  }

  const Icon = config.icon;

  if (type === "payment") {
    const glass = paymentGlassClass[key] ?? paymentGlassClass.UNPAID;
    return <GlassPill glass={glass} Icon={Icon} label={config.label} className={className} />;
  }

  if (type === "rsvp") {
    const glass = rsvpGlassClass[key] ?? rsvpGlassClass.PENDING;
    return <GlassPill glass={glass} Icon={Icon} label={config.label} className={className} />;
  }

  if (type === "task") {
    const glass = taskGlassClass[key] ?? taskGlassClass.TODO;
    const spin = key === "IN_PROGRESS";
    return (
      <GlassPill
        glass={glass}
        Icon={Icon}
        label={config.label}
        spinIcon={spin}
        className={className}
      />
    );
  }

  if (type === "category") {
    const glass = categoryGlassClass[key] ?? categoryGlassClass.OTHER;
    return <GlassPill glass={glass} Icon={Icon} label={config.label} className={className} />;
  }

  if (type === "housekeeping") {
    const hkNorm = value.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
    const hkKey = hkNorm === "in-progress" ? "in-progress" : hkNorm;
    const glass =
      housekeepingGlassClass[hkKey] ?? housekeepingGlassClass["in-progress"];
    const spin = hkKey === "in-progress";
    return (
      <GlassPill
        glass={glass}
        Icon={Icon}
        label={config.label}
        spinIcon={spin}
        className={className}
      />
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      {config.label}
    </Badge>
  );
}

export {
  paymentConfig,
  paymentGlassClass,
  rsvpConfig,
  rsvpGlassClass,
  taskStatusConfig,
  taskGlassClass,
  categoryConfig,
  categoryGlassClass,
  housekeepingGlassClass,
  GLASS_PILL_BASE,
  GLASS,
};
