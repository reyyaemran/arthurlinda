"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";

type CalendarExtraProps = Omit<
  ComponentProps<typeof Calendar>,
  "mode" | "selected" | "onSelect"
>;

export interface DatePickerProps {
  date?: Date;
  setDate: (date?: Date) => void;
  fromDate?: Date;
  id?: string;
  name?: string;
  /** When set, calendar uses month/year dropdowns (react-day-picker v8). Requires fromYear + toYear in calendarProps. */
  calendarProps?: CalendarExtraProps;
  /** If set, renders a hidden input for native form posts (value yyyy-MM-dd). */
  hiddenInputName?: string;
  hiddenInputRequired?: boolean;
  /** Tailwind classes for the trigger when not using the default outline `Button`. */
  triggerClassName?: string;
  /** Calendar icon after the label (matches admin settings fields). */
  iconTrailing?: boolean;
  /** date-fns format string for the trigger label. */
  displayFormat?: string;
  /** Applied to the visible date text (e.g. display font). */
  displayClassName?: string;
  className?: string;
  popoverContentClassName?: string;
}

export function DatePicker({
  date,
  setDate,
  fromDate,
  id,
  name,
  calendarProps,
  hiddenInputName,
  hiddenInputRequired,
  triggerClassName,
  iconTrailing = false,
  displayFormat = "PPP",
  displayClassName,
  className,
  popoverContentClassName,
}: DatePickerProps) {
  const formattedDate = date ? format(date, displayFormat) : undefined;
  const [open, setOpen] = useState(false);
  const { className: calendarClassName, ...restCalendarProps } = calendarProps ?? {};

  const hiddenValue = date ? format(date, "yyyy-MM-dd") : "";

  const label = formattedDate ? (
    <span
      aria-live="polite"
      className={cn(
        triggerClassName && "min-w-0 flex-1 truncate text-left",
        displayClassName,
      )}
    >
      {formattedDate}
    </span>
  ) : (
    <span className="text-muted-foreground">Pick a date</span>
  );

  const icon = (
    <CalendarIcon
      className={cn("h-4 w-4 shrink-0", triggerClassName ? "text-muted-foreground/55" : "mr-2")}
      aria-hidden
    />
  );

  return (
    <div className={cn("relative", className)}>
      {hiddenInputName ? (
        <input
          type="hidden"
          name={hiddenInputName}
          value={hiddenValue}
          readOnly
          required={hiddenInputRequired}
          aria-hidden
        />
      ) : null}

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          {triggerClassName ? (
            <button
              type="button"
              id={id}
              name={name}
              className={cn(triggerClassName, !date && "text-muted-foreground")}
              aria-label="Choose date"
              aria-expanded={open}
              aria-haspopup="dialog"
            >
              {iconTrailing ? (
                <>
                  {label}
                  {icon}
                </>
              ) : (
                <>
                  {icon}
                  {label}
                </>
              )}
            </button>
          ) : (
            <Button
              id={id}
              name={name}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
              )}
              aria-label="Choose date"
              aria-expanded={open}
              aria-haspopup="dialog"
            >
              {icon}
              {label}
            </Button>
          )}
        </PopoverTrigger>

        <PopoverContent
          className={cn("w-auto p-0", popoverContentClassName)}
          role="dialog"
          aria-label="Calendar date picker"
          align="start"
        >
          <Calendar
            key={hiddenValue || "no-date"}
            mode="single"
            selected={date}
            onSelect={(next) => {
              setDate(next);
              setOpen(false);
            }}
            initialFocus
            fromDate={fromDate}
            {...restCalendarProps}
            className={cn("rounded-lg p-2.5 sm:p-3", calendarClassName)}
            aria-label="Select date"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DatePicker;
