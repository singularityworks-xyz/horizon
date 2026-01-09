"use client";

import { ClipboardList, FileText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TemplateCardProps {
  id: string;
  name: string;
  description: string | null;
  projectType: string;
  questionCount: number;
  usageCount: number;
  isActive: boolean;
}

const projectTypeColors: Record<string, string> = {
  WEBSITE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SAAS: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  APP: "bg-green-500/20 text-green-400 border-green-500/30",
  CUSTOM: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export function TemplateCard({
  id,
  name,
  description,
  projectType,
  questionCount,
  usageCount,
  isActive,
}: TemplateCardProps) {
  return (
    <Link className="block" href={`/admin/questionnaire/${id}` as Route}>
      <Card className="group relative cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base transition-colors group-hover:text-primary">
                  {name}
                </CardTitle>
                <Badge
                  className={`mt-1 text-xs ${projectTypeColors[projectType] || ""}`}
                  variant="outline"
                >
                  {projectType}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {description && (
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{questionCount} questions</span>
              </div>
              <div className="text-muted-foreground">
                Used in {usageCount} project{usageCount !== 1 ? "s" : ""}
              </div>
            </div>

            {!isActive && (
              <Badge className="text-xs" variant="secondary">
                Inactive
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
