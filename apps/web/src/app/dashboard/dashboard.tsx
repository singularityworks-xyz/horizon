"use client";

import {
  AlertCircle,
  ClipboardList,
  FolderKanban,
  GitBranch,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { PendingQuestionnaireCard } from "@/components/dashboard/pending-questionnaire-card";
import { StatCard } from "@/components/dashboard/stat-card";
import type { authClient } from "@/lib/auth-client";

interface PendingQuestionnaire {
  id: string;
  project: {
    id: string;
    name: string;
    type: string;
  };
  template: {
    name: string;
    questions: { id: string }[];
  };
  totalQuestions: number;
  answeredQuestions: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface DashboardProps {
  session: typeof authClient.$Infer.Session;
  pendingQuestionnaires: PendingQuestionnaire[];
  projects: Project[];
}

export default function Dashboard({
  session: _session,
  pendingQuestionnaires,
  projects,
}: DashboardProps) {
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="space-y-8">
      {/* Action Required Banner - Shows if there are pending questionnaires */}
      {pendingQuestionnaires.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6">
          {/* Animated background pulse */}
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-500/5 to-orange-500/5" />

          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Action Required</h2>
                <p className="text-muted-foreground text-sm">
                  You have {pendingQuestionnaires.length} questionnaire
                  {pendingQuestionnaires.length !== 1 ? "s" : ""} waiting for
                  your response
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingQuestionnaires.map((q) => (
                <PendingQuestionnaireCard
                  key={q.id}
                  questionnaire={{
                    id: q.id,
                    projectName: q.project.name,
                    templateName: q.template.name,
                    answeredQuestions: q.answeredQuestions,
                    totalQuestions: q.totalQuestions,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          icon={FolderKanban}
          iconColor="text-primary"
          subtitle="All active projects"
          title="Total Projects"
          value={String(activeProjects)}
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
          iconColor={
            pendingQuestionnaires.length > 0 ? "text-yellow-500" : "text-accent"
          }
          subtitle="Awaiting response"
          title="Pending Questionnaires"
          value={String(pendingQuestionnaires.length)}
        />
      </div>

      {/* Additional Content Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-4 font-semibold text-lg">Recent updates</h2>
          <div className="space-y-3 text-sm">
            {pendingQuestionnaires.length > 0 ? (
              pendingQuestionnaires.slice(0, 3).map((q) => (
                <div
                  className="flex items-center gap-3 rounded-lg bg-muted/30 p-3"
                  key={q.id}
                >
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">
                    New questionnaire assigned:{" "}
                    <span className="font-medium text-foreground">
                      {q.template.name}
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  No recent activity to display
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-4 font-semibold text-lg">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              className="block w-full rounded-lg bg-primary px-4 py-3 text-left font-medium text-primary-foreground text-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md"
              href={"/dashboard/projects" as Route}
            >
              View My Projects
            </Link>
            <Link
              className="block w-full rounded-lg bg-secondary px-4 py-3 text-left font-medium text-secondary-foreground text-sm transition-all duration-200 hover:bg-secondary/90 hover:shadow-md"
              href={"/dashboard/questionnaire" as Route}
            >
              {pendingQuestionnaires.length > 0
                ? `Fill Questionnaire (${pendingQuestionnaires.length} pending)`
                : "View Questionnaires"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
