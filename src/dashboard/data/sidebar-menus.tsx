import { LayoutDashboard, Users, Wallet, ListChecks, Camera } from "lucide-react";

export const sidebarMenus = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Guests & RSVP",
      url: "/admin/guests",
      icon: Users,
    },
    {
      title: "Budget Tracker",
      url: "/admin/budget",
      icon: Wallet,
    },
    {
      title: "Checklist",
      url: "/admin/timeline",
      icon: ListChecks,
    },
    {
      title: "Gallery",
      url: "/admin/gallery",
      icon: Camera,
    },
  ],
};
