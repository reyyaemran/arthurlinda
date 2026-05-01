"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type Props = {
  item: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isActive: boolean;
    }[];
  };
};

/**
 * SidebarMenuWrapper Component
 *
 * Renders a single sidebar nav item as a direct link (single-page sidebar).
 * Clicking an item (e.g. Dashboard) navigates directly to its page (e.g. /admin overview).
 */
export function SidebarMenuWrapper({ item }: Props) {
  const isActive = item.isActive ?? false;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.title}>
        <Link
          href={item.url}
          className={cn(
            "cursor-pointer hover:bg-transparent hover:font-bold hover:underline hover:underline-offset-4 active:bg-transparent",
            isActive && "font-bold underline underline-offset-4",
          )}
          aria-label={item.title}
          aria-current={isActive ? "page" : undefined}
        >
          <item.icon
            strokeWidth={isActive ? 2.5 : 1.8}
            aria-hidden="true"
          />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
