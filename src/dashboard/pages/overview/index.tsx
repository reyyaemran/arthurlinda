"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { OverviewStats } from "@/lib/wedding/queries";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

function formatCurrency(amount: number, currency: string) {
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

const paxChartConfig = {
  pax: { label: "Pax" },
  confirmed: { label: "Confirmed", color: "var(--chart-1)" },
  declined: { label: "Declined", color: "var(--chart-2)" },
  pending: { label: "Pending", color: "var(--chart-5)" },
} satisfies ChartConfig;

const budgetSummaryChartConfig = {
  committed: { label: "Committed", color: "var(--chart-5)" },
  remaining: { label: "Remaining", color: "var(--chart-4)" },
} satisfies ChartConfig;

const microLabelClass =
  "text-[11px] font-semibold tracking-[0.2em] uppercase text-foreground/80 [font-family:var(--font-playfair)]";

type OverviewPageProps = {
  stats: OverviewStats;
  currency: string;
};

export function OverviewPage({ stats, currency }: OverviewPageProps) {
  const {
    totalInvitedPax,
    confirmedPax: totalConfirmedPax,
    declinedCount,
    declinedPax,
    pendingPax,
    rsvpRatePercent,
    totalBudget,
    totalCommitted,
    totalSpent,
    doneTasks,
    totalTasks,
    openTasks,
    recentRsvps,
  } = stats;

  const paxChartData = [
    { status: "confirmed", pax: totalConfirmedPax, fill: "var(--color-confirmed)" },
    { status: "declined", pax: declinedPax, fill: "var(--color-declined)" },
    { status: "pending", pax: pendingPax, fill: "var(--color-pending)" },
  ];

  const committedPct = totalBudget > 0 ? Math.min(100, Math.round((totalCommitted / totalBudget) * 100)) : 0;
  const spentPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const remaining = Math.max(0, totalBudget - totalCommitted);
  const remainingPct = totalBudget > 0 ? Math.max(0, Math.round((remaining / totalBudget) * 100)) : 0;
  const budgetDonutData = [
    { name: "Committed", value: Math.max(totalCommitted, 0), fill: "var(--chart-5)" },
    { name: "Remaining", value: Math.max(totalBudget - totalCommitted, 0), fill: "var(--chart-4)" },
  ];
  const progressPercent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1
          className="text-[2rem] font-semibold leading-tight tracking-tight text-foreground sm:text-[2.25rem]"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Dashboard
        </h1>
      </div>

      {/* Metric tiles — same treatment as checklist/budget */}
      <div className="grid grid-cols-2 gap-px border border-border/70 bg-border/60 sm:grid-cols-4">
        <div className="flex flex-col bg-background px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>Total invited</p>
            <Users className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-[1.45rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.65rem]">
            {totalInvitedPax}
          </p>
        </div>
        <div className="flex flex-col bg-background px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>Confirmed</p>
            <UserCheck className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-[1.45rem] font-normal tabular-nums leading-none text-primary sm:text-[1.65rem]">
            {totalConfirmedPax}
          </p>
        </div>
        <div className="flex flex-col bg-background px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>Declined</p>
            <UserX className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-[1.45rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.65rem]">
            {declinedCount}
          </p>
        </div>
        <div className="flex flex-col bg-background px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-2">
            <p className={microLabelClass}>RSVP rate</p>
            <Percent className="h-4 w-4 shrink-0 text-primary/45" aria-hidden />
          </div>
          <p className="mt-3 font-mono text-[1.45rem] font-normal tabular-nums leading-none text-foreground sm:text-[1.65rem]">
            {rsvpRatePercent}%
          </p>
        </div>
      </div>

      {/* Budget row + Recently Guest */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border/60 px-5 py-3">
            <p className={microLabelClass}>Budget summary</p>
          </CardHeader>
          <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[190px_1fr] md:items-center">
              <div className="flex items-center justify-center">
                <ChartContainer config={budgetSummaryChartConfig} className="aspect-square h-[160px]">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) =>
                            `${name}: ${formatCurrency(Number(value), currency)}`
                          }
                        />
                      }
                    />
                    <Pie
                      data={budgetDonutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={72}
                      strokeWidth={4}
                    >
                      <Label
                        position="center"
                        className="fill-foreground font-mono text-[14px] font-semibold tabular-nums"
                      >
                        {`${committedPct}%`}
                      </Label>
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                      Total budget
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatCurrency(totalBudget, currency)} (100%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-full rounded-full bg-[var(--primary)]" />
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-[var(--chart-5)]" />
                      Expense
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatCurrency(totalCommitted, currency)} ({committedPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[var(--chart-5)]" style={{ width: `${committedPct}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-[var(--chart-4)]" />
                    Remaining
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-foreground">
                    {formatCurrency(remaining, currency)} ({remainingPct}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
          <CardHeader className="items-center border-b border-border/60 px-5 py-3 pb-2.5">
            <p className={microLabelClass}>Pax overview</p>
          </CardHeader>
          <CardContent className="flex-1 px-4 pb-0 pt-4 sm:px-5">
            <ChartContainer
              config={paxChartConfig}
              className="mx-auto aspect-square max-h-[210px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={paxChartData}
                  dataKey="pax"
                  nameKey="status"
                  innerRadius={55}
                  strokeWidth={5}
                >
                  <Label
                    position="center"
                    className="fill-foreground font-mono text-3xl font-bold tabular-nums"
                  >
                    {totalConfirmedPax.toLocaleString()}
                  </Label>
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/60 px-3 py-3 text-[11px]">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
              <span className="text-muted-foreground">Confirmed {totalConfirmedPax}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
              <span className="text-muted-foreground">Declined {declinedPax}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-5)" }} />
              <span className="text-muted-foreground">Pending {pendingPax}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Wedding progress + Recent RSVP */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
          <CardHeader className="border-b border-border/60 px-5 py-3">
            <p className={microLabelClass}>Wedding progress</p>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <Progress value={progressPercent} className="mb-3 h-2" />
            <ul className="space-y-1.5">
              {openTasks.length === 0 ? (
                <li className="text-muted-foreground text-xs">No open tasks.</li>
              ) : (
                openTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-1.5 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {task.status === "DONE" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      ) : task.status === "IN_PROGRESS" ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-600 dark:text-sky-400" aria-hidden />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="truncate font-medium">{task.title}</span>
                    </span>
                    <StatusBadge type="task" value={task.status} />
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-5 py-3">
            <p className={microLabelClass}>Recent RSVP</p>
            <Link href="/admin/rsvp">
              <Button variant="ghost" size="sm" className="text-muted-foreground h-7 text-xs">
                See more
                <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 py-4">
            <ul className="space-y-1.5">
              {recentRsvps.length === 0 ? (
                <li className="text-muted-foreground text-xs">No RSVPs yet.</li>
              ) : (
                recentRsvps.map((rsvp) => (
                  <li key={rsvp.id} className="flex items-center justify-between rounded-lg py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9 shrink-0 rounded-full border border-border/50">
                        <AvatarFallback>
                          {rsvp.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{rsvp.name}</p>
                        <p className="text-muted-foreground text-xs">{rsvp.paxCount} pax</p>
                      </div>
                    </div>
                    <StatusBadge type="rsvp" value={rsvp.attendance} />
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
