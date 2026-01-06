"use client";
import { ClipboardList, FolderKanban, GitBranch } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import type { authClient } from "@/lib/auth-client";

export default function Dashboard({
  session: _session,
}: {
  session: typeof authClient.$Infer.Session;
}) {
  return (
    <div className="space-y-8">
      {/* Stat Cards Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          icon={FolderKanban}
          iconColor="text-primary"
          subtitle="All active projects"
          title="Total Projects"
          value="--"
        />
        <StatCard
          icon={GitBranch}
          iconColor="text-secondary"
          subtitle="Ongoing processes"
          title="Open Workflows"
          value="--"
        />
        <StatCard
          icon={ClipboardList}
          iconColor="text-accent"
          subtitle="Awaiting response"
          title="Pending Questionnaires"
          value="--"
        />
      </div>

      {/* Additional Content Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-4 font-semibold text-lg">Recent updates</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">
                No recent activity to display
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-4 font-semibold text-lg">Quick Actions</h2>
          <div className="space-y-2">
            <button
              className="w-full rounded-lg bg-primary px-4 py-3 text-left font-medium text-primary-foreground text-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md"
              type="button"
            >
              View My Projects
            </button>
            <button
              className="w-full rounded-lg bg-secondary px-4 py-3 text-left font-medium text-secondary-foreground text-sm transition-all duration-200 hover:bg-secondary/90 hover:shadow-md"
              type="button"
            >
              Fill Questionnaire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
