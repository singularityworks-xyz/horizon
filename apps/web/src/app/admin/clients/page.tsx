"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc, trpcClient } from "@/utils/trpc";

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const queryClient = useQueryClient();

  // Fetch client statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    trpc.client.getStats.queryOptions()
  );

  // Fetch all clients with search
  const {
    data: clientsData,
    isLoading: clientsLoading,
    error,
  } = useQuery(
    trpc.client.getAll.queryOptions({
      limit: 50,
      search: search || undefined,
    })
  );

  // Delete mutation using trpcClient
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await trpcClient.client.delete.mutate({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["client"]] });
      setDeleteConfirm(null);
    },
  });

  const clients = clientsData?.clients ?? [];

  const handleDelete = (client: { id: string; name: string }) => {
    setDeleteConfirm(client);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl">Clients</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="font-bold text-2xl">{stats?.totalClients}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="font-bold text-2xl">{stats?.activeClients}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="font-bold text-2xl">{stats?.verifiedClients}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Unverified</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="font-bold text-2xl">
                {stats?.unverifiedClients}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <Input
          className="max-w-md"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients by name or email..."
          value={search}
        />
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clientsLoading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => `loading-client-${i}`).map(
                (key) => (
                  <div className="flex items-center space-x-4" key={key}>
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {!clientsLoading && error && (
            <div className="text-center text-red-500">
              Error loading clients: {error.message}
            </div>
          )}

          {!(clientsLoading || error) && clients.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No clients found
            </div>
          )}

          {!(clientsLoading || error) && clients.length > 0 && (
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  className="flex items-start justify-between border-b pb-4 last:border-0"
                  key={client.id}
                >
                  <Link
                    className="flex flex-1 cursor-pointer items-start gap-4 transition-opacity hover:opacity-80"
                    href={`/admin/clients/${client.id}`}
                  >
                    {client.image ? (
                      <Image
                        alt={client.name}
                        className="h-12 w-12 rounded-full object-cover"
                        height={48}
                        src={client.image}
                        width={48}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <span className="font-semibold text-lg">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{client.name}</h3>
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
                      <p className="text-muted-foreground text-sm">
                        {client.email}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-muted-foreground text-xs">
                        <span>Joined {formatDate(client.createdAt)}</span>
                        <span>•</span>
                        <span>{client._count.sessions} sessions</span>
                        <span>•</span>
                        <span>{client._count.accounts} accounts</span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/clients/${client.id}`}>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      onClick={() =>
                        handleDelete({ id: client.id, name: client.name })
                      }
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Are you sure you want to delete{" "}
                <strong>{deleteConfirm.name}</strong>? This action cannot be
                undone.
              </p>
              <p className="text-muted-foreground text-sm">
                This will also delete all associated sessions and accounts.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteConfirm(null)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={deleteMutation.isPending}
                  onClick={confirmDelete}
                  variant="destructive"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
