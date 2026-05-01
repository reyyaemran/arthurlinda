import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md border px-1.5 py-px text-[10px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-2.5 [&>svg]:shrink-0 [&>[data-icon=inline-start]]:mr-0.5 [&>[data-icon=inline-end]]:ml-0.5 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70",
        outline:
          "border-border bg-transparent text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "border-transparent bg-transparent text-primary underline-offset-4 [a&]:hover:underline",
        success:
          "border border-[#505631]/22 bg-[#505631]/11 text-[#2b3210] [a&]:hover:bg-[#505631]/18 dark:border-zinc-500/35 dark:bg-zinc-500/15 dark:text-zinc-100 dark:[a&]:hover:bg-zinc-500/25",
        warning:
          "border border-[#de6e27]/25 bg-[#de6e27]/11 text-[#6b4510] [a&]:hover:bg-[#de6e27]/18 dark:border-[#de6e27]/35 dark:bg-[#de6e27]/16 dark:text-[#f5e6d8] dark:[a&]:hover:bg-[#de6e27]/24",
        info:
          "border border-[#6b7a4a]/28 bg-[#6b7a4a]/12 text-[#2b3210] [a&]:hover:bg-[#6b7a4a]/18 dark:border-zinc-500/30 dark:bg-zinc-500/12 dark:text-zinc-200 dark:[a&]:hover:bg-zinc-500/22",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
