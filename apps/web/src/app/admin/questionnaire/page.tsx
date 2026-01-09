import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getAllTemplates } from "@/actions/questionnaire/template";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TemplateList } from "./template-list";

export default async function AdminQuestionnairePage() {
  const { templates } = await getAllTemplates();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Questionnaire Templates</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage questionnaire templates for your projects.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ variant: "default" }))}
          href={"/admin/questionnaire/new" as Route}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Link>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card/50 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">No templates yet</h3>
          <p className="mb-4 text-center text-muted-foreground text-sm">
            Create your first questionnaire template to get started.
          </p>
          <Link
            className={cn(buttonVariants({ variant: "default" }))}
            href={"/admin/questionnaire/new" as Route}
          >
            Create Template
          </Link>
        </div>
      ) : (
        <TemplateList templates={templates} />
      )}
    </div>
  );
}
