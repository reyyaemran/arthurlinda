"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const formInputClass =
  "h-10 rounded-none border-0 border-b border-border bg-transparent px-0 text-[14px] font-light text-foreground shadow-none placeholder:text-muted-foreground/35 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200";

export const formTextareaClass =
  "rounded-none border-0 border-b border-border bg-transparent px-0 text-[14px] font-light text-foreground shadow-none placeholder:text-muted-foreground/35 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-none transition-colors duration-200";

export function FormFieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <p className="mb-1.5 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-muted-foreground/60">
      {children}
      {optional && (
        <span className="normal-case tracking-normal text-muted-foreground/40">optional</span>
      )}
    </p>
  );
}

/** Primary pill — border + slide-fill on hover (matches guest list, login, RSVP). */
export function SettingsFillButton({
  type = "submit",
  form,
  disabled,
  onClick,
  className,
  children,
}: {
  type?: "submit" | "button";
  form?: string;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      form={form}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative inline-flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary px-6 text-[10px] font-medium tracking-[0.2em] uppercase text-primary transition-colors duration-300 hover:text-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-primary transition-transform duration-300 ease-out group-hover:translate-x-0"
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

export function FormCollapsibleSection({
  id,
  icon,
  label,
  defaultOpen = false,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-5 transition-colors hover:bg-secondary/30"
      >
        <span className="flex items-center gap-3.5">
          <span className="text-primary [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
          <span
            className="text-[15px] font-semibold uppercase leading-tight tracking-[0.14em] text-foreground sm:text-base"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {label}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground/50 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          /* Do not cap height: many story slides + images exceed any small max-h and clip with overflow-hidden. */
          open ? "max-h-[200000px] opacity-100" : "max-h-0 opacity-0",
        )}
        id={id}
      >
        <div className="space-y-6 px-6 pb-8 pt-2">{children}</div>
      </div>
    </div>
  );
}
