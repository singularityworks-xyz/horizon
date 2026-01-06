import type { ReactNode } from "react";

import { ClientSidebar } from "@/components/dashboard/client-sidebar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import Navbar from "@/components/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        {/* Navbar at the top */}
        <Navbar />

        {/* Sidebar below navbar */}
        <ClientSidebar />

        {/* Main content with dynamic margin based on sidebar state */}
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
