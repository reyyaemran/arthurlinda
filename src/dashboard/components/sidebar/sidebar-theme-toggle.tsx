"use client";

import { ThemeTogglePill } from "@/components/theme-toggle-pill";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function SidebarThemeToggle() {
  return (
    <SidebarMenu className="md:hidden">
      <SidebarMenuItem>
        <div className="flex items-center px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <ThemeTogglePill />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
