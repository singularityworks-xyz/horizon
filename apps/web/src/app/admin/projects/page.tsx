import { FolderKanban, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getAllProjects } from "@/actions/project";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

export default async function AdminProjectsPage() {
  const result = await getAllProjects();
  const projects = result.projects ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Projects</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all client projects and their questionnaires.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ variant: "default" }))}
          href={"/admin/projects/new" as Route}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card/50 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">No projects yet</h3>
          <p className="mb-4 text-center text-muted-foreground text-sm">
            Create your first project to get started.
          </p>
          <Link
            className={cn(buttonVariants({ variant: "default" }))}
            href={"/admin/projects/new" as Route}
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              className="block"
              href={`/admin/projects/${project.id}` as Route}
              key={project.id}
            >
              <Card className="group cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base transition-colors group-hover:text-primary">
                          {project.name}
                        </CardTitle>
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
                <CardContent>
                  <div className="flex items-center justify-between text-muted-foreground text-sm">
                    <span>Client: {project.client?.name || "Unknown"}</span>
                    <span>
                      {project.questionnaires?.length || 0} questionnaire(s)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
