import { ArrowLeft, ClipboardList, Eye } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/project";
import { getAllTemplates } from "@/actions/questionnaire/template";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProjectDetailClient } from "./project-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  COMPLETED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ON_HOLD: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
};

const questionnaireStatusColors: Record<string, string> = {
  DRAFT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  SUBMITTED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LOCKED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const { templates } = await getAllTemplates({ activeOnly: true });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          href={"/admin/projects" as Route}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-bold text-2xl">{project.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">{project.type}</Badge>
            <Badge
              className={statusColors[project.status] || ""}
              variant="outline"
            >
              {project.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              {project.client?.name || "Unknown"}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              {project.client?.email || "Unknown"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questionnaires Section */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-border border-b p-4">
          <h2 className="font-semibold text-lg">
            Questionnaires ({project.questionnaires?.length || 0})
          </h2>
          <ProjectDetailClient projectId={project.id} templates={templates} />
        </div>

        <div className="divide-y divide-border">
          {!project.questionnaires || project.questionnaires.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No questionnaires assigned yet. Assign a template above.
            </div>
          ) : (
            project.questionnaires.map((pq) => {
              const answeredCount = pq.answers?.length || 0;
              const totalCount = pq.template?.questions?.length || 0;
              const hasAnswers = answeredCount > 0;

              return (
                <div
                  className="flex items-center justify-between p-4 hover:bg-muted/30"
                  key={pq.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{pq.template?.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          className={`text-xs ${questionnaireStatusColors[pq.status] || ""}`}
                          variant="outline"
                        >
                          {pq.status}
                        </Badge>
                        {pq.submittedAt && (
                          <span className="text-muted-foreground text-xs">
                            Submitted:{" "}
                            {new Date(pq.submittedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">
                      {answeredCount} / {totalCount} answered
                    </span>
                    {hasAnswers && (
                      <Link
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" })
                        )}
                        href={
                          `/admin/projects/${project.id}/questionnaire/${pq.id}` as Route
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Answers
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
