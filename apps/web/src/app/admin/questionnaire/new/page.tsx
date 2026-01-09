"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTemplate } from "@/actions/questionnaire/template";
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

export default function NewTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<
    "WEBSITE" | "SAAS" | "APP" | "CUSTOM"
  >("WEBSITE");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    startTransition(async () => {
      const result = await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        projectType,
      });

      if (result.success) {
        toast.success("Template created successfully");
        router.push(`/admin/questionnaire/${result.data.id}` as Route);
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
          href={"/admin/questionnaire" as Route}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-bold text-2xl">Create New Template</h1>
          <p className="text-muted-foreground text-sm">
            Create a questionnaire template for a project type.
          </p>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              disabled={isPending}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Discovery v1"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              disabled={isPending}
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              value={description}
            />
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
            href={"/admin/questionnaire" as Route}
          >
            Cancel
          </Link>
          <Button disabled={isPending || !name.trim()} type="submit">
            {isPending ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
