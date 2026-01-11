"use client";

import { ArrowLeft, ChevronDown, Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { searchClients } from "@/actions/client";
import { createProject } from "@/actions/project";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const projectTypes = [
  { value: "WEBSITE", label: "Website" },
  { value: "SAAS", label: "SaaS" },
  { value: "APP", label: "App" },
  { value: "CUSTOM", label: "Custom" },
] as const;

type ProjectType = (typeof projectTypes)[number]["value"];

interface Client {
  id: string;
  name: string;
  email: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("WEBSITE");

  // Client selection state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Load clients on mount and when search changes
  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true);
      try {
        const results = await searchClients(searchQuery || undefined);
        setClients(results);
      } catch (error) {
        console.error("Failed to load clients:", error);
      }
      setIsLoadingClients(false);
    };

    const debounce = setTimeout(loadClients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSearchQuery("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    startTransition(async () => {
      const result = await createProject({
        name: name.trim(),
        clientId: selectedClient.id,
        type: projectType,
      });

      if (result.success) {
        toast.success("Project created successfully");
        router.push(`/admin/projects/${result.data.id}` as Route);
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          href={"/admin/projects" as Route}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-bold text-2xl">Create New Project</h1>
          <p className="text-muted-foreground text-sm">
            Create a new project for a client.
          </p>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              disabled={isPending}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Website Redesign"
              value={name}
            />
          </div>

          {/* Client Selection Dropdown */}
          <div className="space-y-2">
            <Label>Select Client *</Label>
            <div className="relative" ref={dropdownRef}>
              {selectedClient ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <div>
                    <p className="font-medium text-sm">{selectedClient.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {selectedClient.email}
                    </p>
                  </div>
                  <button
                    className="rounded p-1 hover:bg-muted"
                    disabled={isPending}
                    onClick={handleClearClient}
                    type="button"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  disabled={isPending}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  type="button"
                >
                  <span className="text-muted-foreground">
                    Select a client...
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isDropdownOpen && "rotate-180"
                    )}
                  />
                </button>
              )}

              {/* Dropdown */}
              {isDropdownOpen && !selectedClient && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                  {/* Search Input */}
                  <div className="border-border border-b p-2">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        className="pl-8"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clients..."
                        value={searchQuery}
                      />
                    </div>
                  </div>

                  {/* Client List */}
                  <div className="max-h-60 overflow-y-auto p-1">
                    {isLoadingClients && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Loading clients...
                      </div>
                    )}
                    {!isLoadingClients && clients.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        {searchQuery
                          ? "No clients found"
                          : "No clients available"}
                      </div>
                    )}
                    {!isLoadingClients &&
                      clients.length > 0 &&
                      clients.map((client) => (
                        <button
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          key={client.id}
                          onClick={() => handleSelectClient(client)}
                          type="button"
                        >
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {client.email}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Project Type *</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {projectTypes.map((type) => (
                <button
                  className={`rounded-lg border-2 px-4 py-3 font-medium text-sm transition-all ${
                    projectType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  disabled={isPending}
                  key={type.value}
                  onClick={() => setProjectType(type.value)}
                  type="button"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            href={"/admin/projects" as Route}
          >
            Cancel
          </Link>
          <Button
            disabled={isPending || !name.trim() || !selectedClient}
            type="submit"
          >
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
