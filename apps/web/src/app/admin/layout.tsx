import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/guards";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // This guard runs once for all admin routes
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">Admin Dashboard</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
            ADMIN
          </span>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
