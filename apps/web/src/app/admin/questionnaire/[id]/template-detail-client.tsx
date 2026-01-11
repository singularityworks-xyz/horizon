"use client";

import { ArrowLeft, Edit2, GripVertical, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addQuestion,
  deleteQuestion,
  reorderQuestions,
  updateQuestion,
} from "@/actions/questionnaire/question";
import {
  deleteTemplate,
  updateTemplate,
} from "@/actions/questionnaire/template";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  options: unknown;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  projectType: string;
  version: number;
  isActive: boolean;
  questions: Question[];
}

const questionTypes = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "BOOLEAN", label: "Yes/No" },
  { value: "SELECT", label: "Single Choice" },
  { value: "MULTI_SELECT", label: "Multiple Choice" },
  { value: "FILE", label: "File Upload" },
] as const;

type QuestionType = (typeof questionTypes)[number]["value"];

export function TemplateDetailClient({ template }: { template: Template }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Template editing
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || "");

  // Question form
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("TEXT");
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  // Drag and drop state
  const [questions, setQuestions] = useState<Question[]>(template.questions);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleSaveTemplate = () => {
    startTransition(async () => {
      const result = await updateTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (result.success) {
        toast.success("Template updated");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeleteTemplate = () => {
    // biome-ignore lint/suspicious/noAlert: Using window.confirm for simple delete confirmation
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTemplate(template.id);
      if (result.success) {
        toast.success("Template deleted");
        router.push("/admin/questionnaire" as Route);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleAddQuestion = () => {
    if (!newQuestionLabel.trim()) {
      toast.error("Question label is required");
      return;
    }

    startTransition(async () => {
      const result = await addQuestion(template.id, {
        label: newQuestionLabel.trim(),
        type: newQuestionType,
        required: newQuestionRequired,
      });

      if (result.success) {
        toast.success("Question added");
        setNewQuestionLabel("");
        setNewQuestionType("TEXT");
        setNewQuestionRequired(false);
        setShowAddQuestion(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    // biome-ignore lint/suspicious/noAlert: Using window.confirm for simple delete confirmation
    if (!window.confirm("Delete this question?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        toast.success("Question deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleToggleRequired = (question: Question) => {
    startTransition(async () => {
      const result = await updateQuestion(question.id, {
        required: !question.required,
      });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder locally for immediate feedback
    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    setQuestions(newQuestions);

    // Build ordered array of question IDs and save to server
    const orderedIds = newQuestions.map((q) => q.id);

    startTransition(async () => {
      const result = await reorderQuestions(template.id, orderedIds);
      if (result.success) {
        toast.success("Questions reordered");
      } else {
        toast.error(result.error);
        // Revert on error
        setQuestions(template.questions);
      }
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            href={"/admin/questionnaire" as Route}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            {isEditing ? (
              <Input
                className="font-bold text-2xl"
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            ) : (
              <h1 className="font-bold text-2xl">{template.name}</h1>
            )}
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">{template.projectType}</Badge>
              <span className="text-muted-foreground text-sm">
                v{template.version}
              </span>
              {!template.isActive && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                Cancel
              </Button>
              <Button disabled={isPending} onClick={handleSaveTemplate}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                disabled={isPending}
                onClick={handleDeleteTemplate}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {isEditing && (
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Template description..."
            value={description}
          />
        </div>
      )}
      {!isEditing && template.description && (
        <p className="text-muted-foreground">{template.description}</p>
      )}

      {/* Questions Section */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-border border-b p-4">
          <div>
            <h2 className="font-semibold text-lg">
              Questions ({questions.length})
            </h2>
            <p className="text-muted-foreground text-xs">
              Drag to reorder questions
            </p>
          </div>
          <Button
            onClick={() => setShowAddQuestion(!showAddQuestion)}
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Add Question Form */}
        {showAddQuestion && (
          <div className="space-y-4 border-border border-b bg-muted/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Question Label *</Label>
                <Input
                  onChange={(e) => setNewQuestionLabel(e.target.value)}
                  placeholder="e.g., What is your target audience?"
                  value={newQuestionLabel}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(e) =>
                    setNewQuestionType(e.target.value as QuestionType)
                  }
                  value={newQuestionType}
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={newQuestionRequired}
                  className="rounded border-input"
                  onChange={(e) => setNewQuestionRequired(e.target.checked)}
                  type="checkbox"
                />
                Required question
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddQuestion(false)}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isPending}
                  onClick={handleAddQuestion}
                  size="sm"
                >
                  Add Question
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List with Drag and Drop */}
        <div className="divide-y divide-border">
          {questions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No questions yet. Add your first question above.
            </div>
          ) : (
            questions.map((question, index) => (
              // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Drag-and-drop requires event handlers on list items
              <li
                className={cn(
                  "flex items-center gap-4 p-4 transition-all",
                  draggedIndex === index && "opacity-50",
                  dragOverIndex === index &&
                    "border-primary border-l-2 bg-primary/10",
                  draggedIndex !== index &&
                    "cursor-grab hover:bg-muted/30 active:cursor-grabbing"
                )}
                draggable
                key={question.id}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragStart={(e) => handleDragStart(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                  }
                }}
              >
                {/* Drag Handle */}
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1">
                  <p className="font-medium">{question.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className="text-xs" variant="outline">
                      {question.type}
                    </Badge>
                    {question.required && (
                      <Badge className="text-xs" variant="secondary">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    disabled={isPending}
                    onClick={() => handleToggleRequired(question)}
                    size="sm"
                    variant="ghost"
                  >
                    {question.required ? "Make Optional" : "Make Required"}
                  </Button>
                  <Button
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDeleteQuestion(question.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
