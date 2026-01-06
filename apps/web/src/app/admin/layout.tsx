import type { ReactNode } from "react";
import { AdminContent } from "@/components/dashboard/admin-content";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import Navbar from "@/components/navbar";
import { requireAdmin } from "@/lib/guards";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // This guard runs once for all admin routes
  await requireAdmin();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        {/* Navbar at the top */}
        <Navbar />

        {/* Sidebar below navbar */}
        <AdminSidebar />

        {/* Main content with dynamic margin based on sidebar state */}
        <AdminContent>{children}</AdminContent>
      </div>
    </SidebarProvider>
  );
}
