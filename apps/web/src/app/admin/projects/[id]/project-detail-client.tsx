"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignTemplateToProject } from "@/actions/questionnaire/assignment";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  name: string;
  projectType: string;
}

interface ProjectDetailClientProps {
  projectId: string;
  templates: Template[];
}

export function ProjectDetailClient({
  projectId,
  templates,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleAssign = (templateId: string) => {
    startTransition(async () => {
      const result = await assignTemplateToProject(projectId, templateId);
      if (result.success) {
        toast.success("Template assigned successfully");
        setShowDropdown(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  if (templates.length === 0) {
    return (
      <Button disabled size="sm">
        No templates available
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        disabled={isPending}
        onClick={() => setShowDropdown(!showDropdown)}
        size="sm"
      >
        <Plus className="mr-2 h-4 w-4" />
        Assign Template
      </Button>

      {showDropdown && (
        <>
          <button
            aria-label="Close dropdown"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setShowDropdown(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowDropdown(false);
              }
            }}
            tabIndex={-1}
            type="button"
          />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-popover p-2 shadow-lg">
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {templates.map((template) => (
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  disabled={isPending}
                  key={template.id}
                  onClick={() => handleAssign(template.id)}
                  type="button"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {template.projectType}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
