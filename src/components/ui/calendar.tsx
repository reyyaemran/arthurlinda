"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2.5 sm:p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        /** Inset from absolute prev/next so month/year selects don’t sit under the arrows. */
        caption: "relative flex justify-center px-7 pt-1",
        caption_label: "text-sm font-medium",
        /** Visually hide captions only meant for SR (dropdown mode duplicates). */
        vhidden: "sr-only",
        /**
         * Grid: month flexes, year gets intrinsic width so 4-digit years never clip (flex was squeezing the year).
         * `max-w-[14rem]` matches 7× day cell width (w-8) so the header aligns with the grid.
         */
        caption_dropdowns:
          "mx-auto grid w-full max-w-[14rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2",
        /** Minimal native `<select>` — hide RDP’s decorative caption + icon mirror. */
        dropdown:
          "relative z-20 box-border h-8 min-h-8 w-full min-w-0 cursor-pointer rounded-none border-0 border-b border-border/55 bg-transparent py-1 pl-0 pr-1 text-left text-xs font-medium text-foreground/90 shadow-none outline-none transition-[color,border-color] hover:border-foreground/35 hover:text-foreground focus-visible:border-primary focus-visible:ring-0",
        dropdown_month: "relative min-w-0 [&>div:last-child]:hidden [&>select]:min-w-0 [&>select]:w-full",
        dropdown_year:
          "relative shrink-0 [&>div:last-child]:hidden [&>select]:w-auto [&>select]:min-w-[5.25rem] [&>select]:flex-none [&>select]:tabular-nums [&>select]:pr-6",
        dropdown_icon: "hidden",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-7 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }
