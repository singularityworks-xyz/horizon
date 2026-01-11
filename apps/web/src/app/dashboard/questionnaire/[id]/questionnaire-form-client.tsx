"use client";

import type { Prisma } from "@horizon/db";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  saveAnswer,
  submitQuestionnaire,
} from "@/actions/questionnaire/answer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  options: Record<string, string[]> | null;
}

interface QuestionnaireFormClientProps {
  questionnaire: {
    id: string;
    status: string;
    projectName: string;
    templateName: string;
    questions: Question[];
  };
  initialAnswers: Record<string, unknown>;
}

export function QuestionnaireFormClient({
  questionnaire,
  initialAnswers,
}: QuestionnaireFormClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] =
    useState<Record<string, unknown>>(initialAnswers);
  const [savingField, setSavingField] = useState<string | null>(null);

  const isReadOnly = questionnaire.status !== "DRAFT";

  const handleSaveAnswer = (questionId: string, value: unknown) => {
    if (isReadOnly) {
      return;
    }

    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSavingField(questionId);

    startTransition(async () => {
      const result = await saveAnswer(
        questionnaire.id,
        questionId,
        value as Prisma.InputJsonValue
      );
      if (!result.success) {
        toast.error(result.error);
      }
      setSavingField(null);
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await submitQuestionnaire(questionnaire.id);
      if (result.success) {
        toast.success("Questionnaire submitted successfully!");
        router.push("/dashboard/questionnaire" as Route);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const answeredCount = Object.keys(answers).length;
  const totalCount = questionnaire.questions.length;
  const requiredCount = questionnaire.questions.filter(
    (q) => q.required
  ).length;
  const answeredRequiredCount = questionnaire.questions.filter(
    (q) => q.required && answers[q.id] !== undefined
  ).length;
  const canSubmit = answeredRequiredCount === requiredCount;
  const progress =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            href={"/dashboard/questionnaire" as Route}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-bold text-2xl">{questionnaire.templateName}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {questionnaire.projectName}
              </span>
              <Badge
                variant={
                  questionnaire.status === "SUBMITTED" ? "success" : "secondary"
                }
              >
                {questionnaire.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-muted-foreground text-xs">
          {answeredCount} of {totalCount} questions answered
          {requiredCount > 0 &&
            ` • ${answeredRequiredCount}/${requiredCount} required`}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questionnaire.questions.map((question, index) => (
          <div
            className="space-y-3 rounded-xl border border-border bg-card p-4"
            key={question.id}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-medium text-xs">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <Label className="font-medium text-base">
                    {question.label}
                    {question.required && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </Label>
                </div>
              </div>
              {savingField === question.id && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {savingField !== question.id &&
                answers[question.id] !== undefined && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
            </div>

            <QuestionInput
              disabled={isReadOnly}
              onChange={(value) => handleSaveAnswer(question.id, value)}
              question={question}
              value={answers[question.id]}
            />
          </div>
        ))}
      </div>

      {/* Submit Section */}
      {!isReadOnly && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">Ready to submit?</p>
            <p className="text-muted-foreground text-sm">
              {canSubmit
                ? "All required questions are answered."
                : `${requiredCount - answeredRequiredCount} required question(s) remaining.`}
            </p>
          </div>
          <Button disabled={!canSubmit || isPending} onClick={handleSubmit}>
            {isPending ? "Submitting..." : "Submit Questionnaire"}
          </Button>
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-muted-foreground">
            This questionnaire has been submitted and is now read-only.
          </p>
        </div>
      )}
    </div>
  );
}

// Question Input Component
function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case "TEXT":
      return (
        <Input
          disabled={disabled}
          onBlur={(e) => onChange(e.target.value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your answer..."
          value={(value as string) || ""}
        />
      );

    case "NUMBER":
      return (
        <Input
          disabled={disabled}
          onChange={(e) =>
            onChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder="Enter a number..."
          type="number"
          value={(value as number) ?? ""}
        />
      );

    case "BOOLEAN":
      return (
        <div className="flex gap-4">
          <button
            className={cn(
              "flex-1 rounded-lg border-2 px-4 py-3 font-medium text-sm transition-all",
              value === true
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
            onClick={() => onChange(true)}
            type="button"
          >
            Yes
          </button>
          <button
            className={cn(
              "flex-1 rounded-lg border-2 px-4 py-3 font-medium text-sm transition-all",
              value === false
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
            onClick={() => onChange(false)}
            type="button"
          >
            No
          </button>
        </div>
      );

    case "SELECT": {
      const options = question.options?.choices || [];
      return (
        <div className="space-y-2">
          {options.map((option) => (
            <button
              className={cn(
                "w-full rounded-lg border-2 px-4 py-3 text-left font-medium text-sm transition-all",
                value === option
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              disabled={disabled}
              key={option}
              onClick={() => onChange(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    case "MULTI_SELECT": {
      const multiOptions = question.options?.choices || [];
      const selectedValues = (value as string[]) || [];
      return (
        <div className="space-y-2">
          {multiOptions.map((option) => (
            <button
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-medium text-sm transition-all",
                selectedValues.includes(option)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50",
                disabled && "cursor-not-allowed opacity-50"
              )}
              disabled={disabled}
              key={option}
              onClick={() => {
                if (disabled) {
                  return;
                }
                const newValues = selectedValues.includes(option)
                  ? selectedValues.filter((v) => v !== option)
                  : [...selectedValues, option];
                onChange(newValues);
              }}
              type="button"
            >
              <Checkbox
                checked={selectedValues.includes(option)}
                disabled={disabled}
                tabIndex={-1}
              />
              {option}
            </button>
          ))}
        </div>
      );
    }

    case "FILE":
      return (
        <div className="rounded-lg border-2 border-border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            File upload coming soon
          </p>
        </div>
      );

    default:
      return (
        <Input
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your answer..."
          value={(value as string) || ""}
        />
      );
  }
}
