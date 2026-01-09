"use client";

import { TemplateCard } from "@/components/questionnaire/template-card";

interface Template {
  id: string;
  name: string;
  description: string | null;
  projectType: string;
  questionCount: number;
  usageCount: number;
  isActive: boolean;
}

interface TemplateListProps {
  templates: Template[];
}

export function TemplateList({ templates }: TemplateListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          description={template.description}
          id={template.id}
          isActive={template.isActive}
          key={template.id}
          name={template.name}
          projectType={template.projectType}
          questionCount={template.questionCount}
          usageCount={template.usageCount}
        />
      ))}
    </div>
  );
}
