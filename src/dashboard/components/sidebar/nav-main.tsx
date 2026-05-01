"use client";

import { type LucideIcon } from "lucide-react";

import { useActiveMenu } from "@/hooks/use-active-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { SidebarMenuWrapper } from "./sidebar-menu-wrapper";

interface NavMainProps {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}

/**
 * NavMain Component
 *
 * Primary navigation section in the dashboard sidebar.
 * Single-page flat list: each item is a direct link (e.g. Dashboard → overview).
 */
export function NavMain({ items }: NavMainProps) {
  const { activeItems } = useActiveMenu(items);

  return (
    <SidebarGroup aria-label="Platform navigation">
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {activeItems.map((item) => (
          <SidebarMenuWrapper key={item.url} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
