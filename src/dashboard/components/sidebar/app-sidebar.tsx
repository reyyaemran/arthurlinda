"use client";

import * as React from "react";
import Link from "next/link";

import { NavMain } from "@/dashboard/components/sidebar/nav-main";
import { NavUser } from "@/dashboard/components/sidebar/nav-user";
import { SidebarThemeToggle } from "@/dashboard/components/sidebar/sidebar-theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SessionUser } from "@/lib/auth/session";
import { sidebarMenus } from "@/dashboard/data/sidebar-menus";

export function AppSidebar({
  user: sessionUser,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SessionUser }) {
  const navUser = {
    name: sessionUser.name,
    email: sessionUser.email,
    avatar: sessionUser.avatar,
  };
  const { open } = useSidebar();

  React.useEffect(() => {
    localStorage.setItem("sidebar-open", open.toString());
  }, [open]);

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      {...props}
      aria-label="Main navigation"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              className="group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!min-h-11 group-data-[collapsible=icon]:!min-w-11 group-data-[collapsible=icon]:!p-1"
            >
              <Link
                href="/admin"
                className="hover:bg-transparent flex w-full min-w-0 items-center justify-start gap-0 group-data-[collapsible=icon]:justify-center"
                aria-label="Go to dashboard home"
              >
                <span
                  className="inline-flex min-w-0 max-w-full items-center gap-x-1 truncate text-2xl font-bold tracking-normal text-foreground group-data-[collapsible=icon]:hidden"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  <span>Arthur</span>
                  <span className="shrink-0 text-muted-foreground/60">&</span>
                  <span>Linda</span>
                </span>
                <span
                  className="hidden text-xl font-bold leading-none tracking-tighter text-foreground group-data-[collapsible=icon]:inline"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  A<span className="text-muted-foreground/60" aria-hidden="true">·</span>L
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarMenus.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarThemeToggle />
        <div className="hidden md:block">
          <NavUser user={navUser} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
