"use client";

import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { useSidebar } from "./sidebar-context";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    name: "Workflows",
    href: "/dashboard/workflow",
    icon: GitBranch,
  },
  {
    name: "Questionnaire",
    href: "/dashboard/questionnaire",
    icon: ClipboardList,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function ClientSidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed top-16 left-0 h-[calc(100vh-4rem)] border-border border-r bg-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Collapse Toggle Button */}
        <div className="flex items-center justify-end border-border border-b p-2">
          <button
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="rounded-lg p-2 transition-colors hover:bg-sidebar-accent"
            onClick={() => setIsCollapsed(!isCollapsed)}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center"
                )}
                href={item.href as Route}
                key={item.href}
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isActive
                      ? "border-sidebar-primary-foreground"
                      : "border-sidebar-foreground/30"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
