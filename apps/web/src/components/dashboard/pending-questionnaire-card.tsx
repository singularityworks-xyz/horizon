"use client";

import { ClipboardList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PendingQuestionnaireCardProps {
  questionnaire: {
    id: string;
    projectName: string;
    templateName: string;
    answeredQuestions: number;
    totalQuestions: number;
  };
}

export function PendingQuestionnaireCard({
  questionnaire,
}: PendingQuestionnaireCardProps) {
  const progress =
    questionnaire.totalQuestions > 0
      ? Math.round(
          (questionnaire.answeredQuestions / questionnaire.totalQuestions) * 100
        )
      : 0;

  function getProgressTextColor() {
    if (progress === 0) {
      return "text-muted-foreground";
    }
    if (progress === 100) {
      return "text-green-500";
    }
    return "text-primary";
  }

  function getProgressBarColor() {
    if (progress === 0) {
      return "bg-muted-foreground/30";
    }
    if (progress === 100) {
      return "bg-green-500";
    }
    return "bg-primary";
  }

  return (
    <Link
      className="group relative block rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
      href={`/dashboard/questionnaire/${questionnaire.id}` as Route}
    >
      {/* Pulsing notification indicator */}
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
      </span>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="truncate font-medium text-sm group-hover:text-primary">
              {questionnaire.templateName}
            </h3>
            <Badge className="shrink-0 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              Pending
            </Badge>
          </div>

          <p className="mb-3 truncate text-muted-foreground text-xs">
            {questionnaire.projectName}
          </p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className={cn("font-medium", getProgressTextColor())}>
                {progress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  getProgressBarColor()
                )}
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {questionnaire.answeredQuestions} of{" "}
              {questionnaire.totalQuestions} questions answered
            </p>
          </div>
        </div>
      </div>

      {/* Fill now button */}
      <div className="mt-3 flex justify-end">
        <span className="rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary text-xs transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          Fill Now →
        </span>
      </div>
    </Link>
  );
}
