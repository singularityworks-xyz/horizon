"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { useSidebar } from "./sidebar-context";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin" as const,
    icon: LayoutDashboard,
  },
  {
    name: "Clients",
    href: "/admin/clients" as const,
    icon: Users,
  },
  {
    name: "Projects",
    href: "/admin/projects" as const,
    icon: FolderKanban,
  },
  {
    name: "Workflows",
    href: "/admin/workflows" as const,
    icon: GitBranch,
  },
  {
    name: "Questionnaire",
    href: "/admin/questionnaire" as const,
    icon: ClipboardList,
  },
  {
    name: "Analytics",
    href: "/admin/analytics" as const,
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/admin/settings" as const,
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed top-16 left-0 h-[calc(100vh-4rem)] border-border/50 border-r bg-sidebar/95 backdrop-blur-sm transition-all duration-300 ease-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Collapse Toggle Button */}
        <div className="flex items-center justify-end border-border/50 border-b p-2">
          <button
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="rounded-lg p-2 transition-all duration-200 hover:scale-105 hover:bg-sidebar-accent active:scale-95"
            onClick={() => setIsCollapsed(!isCollapsed)}
            type="button"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-sidebar-foreground transition-transform duration-200" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-sidebar-foreground transition-transform duration-200" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-3 font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                    : "text-sidebar-foreground hover:translate-x-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center"
                )}
                href={item.href as Route}
                key={item.href}
                style={{ animationDelay: `${index * 50}ms` }}
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                    isActive
                      ? "border-sidebar-primary-foreground bg-sidebar-primary-foreground/10"
                      : "border-sidebar-foreground/30 group-hover:border-primary group-hover:bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      !isActive && "group-hover:scale-110"
                    )}
                  />
                </div>
                {!isCollapsed && (
                  <span className="transition-all duration-200 group-hover:font-semibold">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
