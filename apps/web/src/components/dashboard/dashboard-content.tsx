"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { useSidebar } from "./sidebar-context";

export function DashboardContent({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className={cn(
        "p-8 pt-16 transition-all duration-300",
        isCollapsed ? "pl-20" : "pl-68"
      )}
    >
      {children}
    </main>
  );
}
