"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Mail, Shield, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const {
    data: client,
    isLoading,
    error,
  } = useQuery(trpc.client.getById.queryOptions({ id: clientId }));

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
            <CardTitle className="font-medium text-sm">Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">
              {client.emailVerified ? "Verified" : "Unverified"}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Accounts</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-xl">{client._count.accounts}</div>
          </CardContent>
        </Card>
      </div>

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
