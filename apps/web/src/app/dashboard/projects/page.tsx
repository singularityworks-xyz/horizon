import { ClipboardList, FolderKanban } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getProjectsByClient } from "@/actions/project";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  COMPLETED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ON_HOLD: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const typeColors: Record<string, string> = {
  WEBSITE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  SAAS: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  APP: "bg-green-500/20 text-green-400 border-green-500/30",
  CUSTOM: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const questionnaireStatusColors: Record<string, string> = {
  DRAFT: "bg-yellow-500/20 text-yellow-400",
  SUBMITTED: "bg-blue-500/20 text-blue-400",
  LOCKED: "bg-gray-500/20 text-gray-400",
};

function getQuestionnaireStatusText(status: string): string {
  if (status === "DRAFT") {
    return "In progress";
  }
  if (status === "SUBMITTED") {
    return "Submitted";
  }
  return "Locked";
}

export default async function ClientProjectsPage() {
  const projects = await getProjectsByClient();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">My Projects</h1>
        <p className="mt-1 text-muted-foreground">
          View your projects and their questionnaire status.
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card/50 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">No projects yet</h3>
          <p className="text-center text-muted-foreground text-sm">
            You don't have any projects assigned yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {projects.map((project) => (
            <Card
              className="overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
              key={project.id}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <FolderKanban className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          className={`text-xs ${typeColors[project.type] || ""}`}
                          variant="outline"
                        >
                          {project.type}
                        </Badge>
                        <Badge
                          className={`text-xs ${statusColors[project.status] || ""}`}
                          variant="outline"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Questionnaires */}
                {project.questionnaires && project.questionnaires.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground text-sm">
                      Questionnaires
                    </h4>
                    <div className="space-y-2">
                      {project.questionnaires.map((pq) => (
                        <Link
                          className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                          href={`/dashboard/questionnaire/${pq.id}` as Route}
                          key={pq.id}
                        >
                          <div className="flex items-center gap-3">
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {pq.template?.name || "Questionnaire"}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {getQuestionnaireStatusText(pq.status)}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`text-xs ${questionnaireStatusColors[pq.status] || ""}`}
                          >
                            {pq.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border border-dashed p-4 text-center text-muted-foreground text-sm">
                    No questionnaires assigned yet
                  </div>
                )}

                {/* View Details Link */}
                <div className="border-border border-t pt-3">
                  <p className="text-muted-foreground text-xs">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
