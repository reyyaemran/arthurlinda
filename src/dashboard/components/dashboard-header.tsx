"use client";

import React from "react";
import Link from "next/link";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  LogOut,
  Settings,
  User,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeTogglePill } from "@/components/theme-toggle-pill";
import { useHeaderSearch } from "@/hooks/use-header-search";
import type { SessionUser } from "@/lib/auth/session";

type Props = {
  user: SessionUser;
};

export const DashboardHeader = ({ user }: Props) => {
  const { open, isMobile } = useSidebar();
  const router = useRouter();
  const { visible: searchVisible, query, setQuery, clear, placeholder } = useHeaderSearch();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header
      className="flex h-16 shrink-0 items-center gap-3 px-4 transition-all duration-200"
      role="banner"
    >
      {/* Left — sidebar toggle */}
      <div className="flex shrink-0 items-center">
        <SidebarTrigger
          icon={
            open ? (
              <PanelLeftCloseIcon aria-hidden="true" />
            ) : (
              <PanelLeftOpenIcon aria-hidden="true" />
            )
          }
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          aria-expanded={open}
          aria-controls="main-sidebar"
        />
      </div>

      {/* Center — pill search (only on pages that opt in) */}
      {searchVisible ? (
        <div className="mx-auto flex w-full max-w-[200px] items-center sm:max-w-xs">
          <div
            className="relative flex h-10 w-full items-center rounded-full border border-border/60 bg-muted/30 transition-colors focus-within:border-primary/50 focus-within:bg-background"
            onClick={() => inputRef.current?.focus()}
          >
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground/50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-full w-full bg-transparent pl-9 pr-9 text-[11px] tracking-wide text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/15 text-muted-foreground transition-colors hover:bg-muted-foreground/25"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right — theme + avatar */}
      <div className="flex shrink-0 items-center gap-3">
        <ThemeTogglePill className="hidden md:inline-flex" />

        {isMobile && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User profile and options"
            >
              <Avatar className="h-8 w-8 rounded-full">
                {user.avatar ? (
                  <AvatarImage
                    src={user.avatar}
                    alt={`${user.name}'s profile`}
                  />
                ) : null}
                <AvatarFallback className="rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={8}
            role="menu"
            aria-label="User options"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.avatar ? (
                    <AvatarImage
                      src={user.avatar}
                      alt={`${user.name}'s profile`}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 items-center text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild role="menuitem">
                <Link href="/admin/settings/account">
                  <User aria-hidden="true" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild role="menuitem">
                <Link href="/admin/settings/account?tab=wedding">
                  <Settings aria-hidden="true" />
                  My Wedding
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} role="menuitem">
              <LogOut aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </header>
  );
};
