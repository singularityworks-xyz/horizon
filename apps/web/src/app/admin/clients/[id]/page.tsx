"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Eye,
  FolderKanban,
  Shield,
  User,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProjectsByClient } from "@/actions/project";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: Date;
  questionnaires: {
    id: string;
    status: string;
    template: {
      name: string;
    } | null;
    _count: {
      answers: number;
    };
  }[];
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const {
    data: client,
    isLoading,
    error,
  } = useQuery(trpc.client.getById.queryOptions({ id: clientId }));

  // Load projects for this client
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const result = await getProjectsByClient(clientId);
        setProjects(result as Project[]);
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
      setIsLoadingProjects(false);
    };
    loadProjects();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-destructive">
          Error loading client: {error.message}
        </p>
        <Link href="/admin/clients">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-muted-foreground">Client not found</p>
        <Link href="/admin/clients">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/clients">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          {client.image ? (
            <Image
              alt={client.name}
              className="h-16 w-16 rounded-full object-cover"
              height={64}
              src={client.image}
              width={64}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl">{client.name}</h1>
              {client.emailVerified ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 text-xs">
                  Verified
                </span>
              ) : (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                  Unverified
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Joined</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">
              {formatDate(client.createdAt)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Questionnaires
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">
              {projects.reduce((acc, p) => acc + p.questionnaires.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Sessions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">{client._count.sessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Projects</CardTitle>
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            href={"/admin/projects/new" as Route}
          >
            Create Project
          </Link>
        </CardHeader>
        <CardContent>
          {isLoadingProjects && (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}
          {!isLoadingProjects && projects.length === 0 && (
            <div className="rounded-lg border border-border border-dashed p-8 text-center">
              <FolderKanban className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No projects yet for this client.
              </p>
            </div>
          )}
          {!isLoadingProjects && projects.length > 0 && (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  className="rounded-lg border border-border p-4"
                  key={project.id}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Link
                          className="font-medium hover:text-primary hover:underline"
                          href={`/admin/projects/${project.id}` as Route}
                        >
                          {project.name}
                        </Link>
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
                    <span className="text-muted-foreground text-xs">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>

                  {/* Project's Questionnaires */}
                  {project.questionnaires.length > 0 && (
                    <div className="mt-3 border-border border-t pt-3">
                      <p className="mb-2 text-muted-foreground text-xs">
                        Questionnaires ({project.questionnaires.length})
                      </p>
                      <div className="space-y-2">
                        {project.questionnaires.map((q) => {
                          const hasAnswers = q._count.answers > 0;
                          return (
                            <div
                              className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
                              key={q.id}
                            >
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {q.template?.name || "Questionnaire"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs ${questionnaireStatusColors[q.status] || ""}`}
                                >
                                  {q.status}
                                </Badge>
                                {hasAnswers && (
                                  <Link
                                    className={cn(
                                      buttonVariants({
                                        variant: "ghost",
                                        size: "sm",
                                      }),
                                      "h-7 px-2"
                                    )}
                                    href={
                                      `/admin/projects/${project.id}/questionnaire/${q.id}` as Route
                                    }
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    View
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions and Accounts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {client.sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No sessions found</p>
            ) : (
              <div className="space-y-4">
                {client.sessions.map((session) => (
                  <div
                    className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                    key={session.id}
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {session.ipAddress ?? "Unknown IP"}
                      </p>
                      <p className="line-clamp-1 text-muted-foreground text-xs">
                        {session.userAgent ?? "Unknown device"}
                      </p>
                    </div>
                    <div className="text-right text-muted-foreground text-xs">
                      <p>Created: {formatDateTime(session.createdAt)}</p>
                      <p>Expires: {formatDateTime(session.expiresAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {client.accounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No linked accounts
              </p>
            ) : (
              <div className="space-y-4">
                {client.accounts.map((account) => (
                  <div
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    key={account.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {account.providerId}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Connected {formatDate(account.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
