import { ArrowLeft, Check, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnswersByQuestionnaire } from "@/actions/questionnaire/answer";
import { getProjectQuestionnaire } from "@/actions/questionnaire/assignment";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string; qid: string }>;
}

const questionnaireStatusColors: Record<string, string> = {
  DRAFT: "bg-yellow-500/20 text-yellow-400",
  SUBMITTED: "bg-blue-500/20 text-blue-400",
  LOCKED: "bg-gray-500/20 text-gray-400",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not answered";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
}

export default async function ViewQuestionnaireAnswersPage({ params }: Props) {
  const { id: projectId, qid: questionnaireId } = await params;

  const questionnaire = await getProjectQuestionnaire(questionnaireId);

  if (!questionnaire || questionnaire.project.id !== projectId) {
    notFound();
  }

  const answers = await getAnswersByQuestionnaire(questionnaireId);

  // Create a map of questionId -> answer for easy lookup
  const answersMap = new Map(answers.map((a) => [a.questionId, a.value]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          href={`/admin/projects/${projectId}` as Route}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-muted-foreground text-sm">
            {questionnaire.project.name}
          </p>
          <h1 className="font-bold text-2xl">{questionnaire.template.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              className={questionnaireStatusColors[questionnaire.status] || ""}
            >
              {questionnaire.status}
            </Badge>
            {questionnaire.submittedAt && (
              <span className="text-muted-foreground text-sm">
                Submitted:{" "}
                {new Date(questionnaire.submittedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-sm">Total Questions</p>
            <p className="font-bold text-2xl">
              {questionnaire.template.questions.length}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Answered</p>
            <p className="font-bold text-2xl">{answers.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Client</p>
            <p className="font-medium">
              {questionnaire.project.client?.name || "Unknown"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-border border-b p-4">
          <h2 className="font-semibold text-lg">Answers</h2>
        </div>

        <div className="divide-y divide-border">
          {questionnaire.template.questions.map((question, index) => {
            const answer = answersMap.get(question.id);
            const isAnswered = answer !== undefined;

            return (
              <div className="p-4" key={question.id}>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {question.label}
                          {question.required && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge className="text-xs" variant="outline">
                            {question.type}
                          </Badge>
                        </div>
                      </div>
                      {isAnswered ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Answer Display */}
                    <div
                      className={cn(
                        "mt-3 rounded-lg p-3",
                        isAnswered
                          ? "bg-muted/50"
                          : "border border-border border-dashed bg-muted/20"
                      )}
                    >
                      {isAnswered ? (
                        <p className="text-sm">{formatValue(answer)}</p>
                      ) : (
                        <p className="text-muted-foreground text-sm italic">
                          Not answered
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
