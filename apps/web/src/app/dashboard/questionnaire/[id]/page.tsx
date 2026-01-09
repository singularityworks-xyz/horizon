import { notFound } from "next/navigation";
import { getProjectQuestionnaire } from "@/actions/questionnaire/assignment";
import { QuestionnaireFormClient } from "./questionnaire-form-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuestionnaireFormPage({ params }: Props) {
  const { id } = await params;
  const questionnaire = await getProjectQuestionnaire(id);

  if (!questionnaire) {
    notFound();
  }

  // Transform answers into a map for easy access
  const answersMap: Record<string, unknown> = {};
  for (const answer of questionnaire.answers) {
    answersMap[answer.questionId] = answer.value;
  }

  return (
    <QuestionnaireFormClient
      initialAnswers={answersMap}
      questionnaire={{
        id: questionnaire.id,
        status: questionnaire.status,
        projectName: questionnaire.project.name,
        templateName: questionnaire.template.name,
        questions: questionnaire.template.questions.map((q) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          required: q.required,
          order: q.order,
          options: q.options as Record<string, string[]> | null,
        })),
      }}
    />
  );
}
