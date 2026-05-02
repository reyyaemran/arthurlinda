"use client";

// External dependencies
import React from "react";
import { useIsClient } from "@uidotdev/usehooks";

// Internal components
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { HeaderSearchProvider } from "@/hooks/use-header-search";
import type { SessionUser } from "@/lib/auth/session";

import { AppSidebar } from "./sidebar/app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";

/**
 * Props interface for DashboardLayoutWrapper component
 */
type Props = {
  children: React.ReactNode;
  user: SessionUser;
};

/**
 * DashboardLayoutWrapper Component
 *
 * Main layout wrapper for dashboard pages.
 * Handles sidebar state and provides the basic layout structure with
 * sidebar, header, and content area.
 *
 * @param {Props} props - Component props
 * @param {React.ReactNode} props.children - Content to render in the main area
 */
function DashboardLayoutWrapper({ children, user }: Props) {
  const isClient = useIsClient();

  // Get sidebar open state from localStorage, with fallback to true
  const isOpen = isClient
    ? localStorage.getItem("sidebar-open")
      ? localStorage.getItem("sidebar-open") === "true"
      : true
    : true;

  // Show skeleton during initial client-side rendering
  if (!isClient) {
    return <DashboardSkeleton />;
  }

  return (
    <HeaderSearchProvider>
      <SidebarProvider defaultOpen={isOpen}>
        <AppSidebar id="main-sidebar" user={user} />
        <SidebarInset
          className="flex flex-col bg-background md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0"
          role="main"
        >
          <DashboardHeader user={user} />
          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-5"
            aria-label="Dashboard content"
          >
            <div className="mx-auto min-h-0">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HeaderSearchProvider>
  );
}

export default DashboardLayoutWrapper;
