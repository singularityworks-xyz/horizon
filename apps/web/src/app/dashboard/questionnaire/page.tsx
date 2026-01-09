import { ClipboardList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { getClientPendingQuestionnaires } from "@/actions/questionnaire/assignment";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function ClientQuestionnairePage() {
  const questionnaires = await getClientPendingQuestionnaires();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Questionnaires</h1>
        <p className="mt-1 text-muted-foreground">
          Complete your project questionnaires to help us understand your needs.
        </p>
      </div>

      {/* Questionnaires Grid */}
      {questionnaires.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card/50 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">All caught up!</h3>
          <p className="text-center text-muted-foreground text-sm">
            You have no pending questionnaires to complete.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {questionnaires.map((q) => {
            const progress =
              q.totalQuestions > 0
                ? Math.round((q.answeredQuestions / q.totalQuestions) * 100)
                : 0;

            return (
              <Card
                className="overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg"
                key={q.id}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {q.template.name}
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">
                          {q.project.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {q.template.description && (
                    <p className="line-clamp-2 text-muted-foreground text-sm">
                      {q.template.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {q.answeredQuestions} of {q.totalQuestions} questions
                    </p>
                  </div>

                  <Link
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "w-full"
                    )}
                    href={`/dashboard/questionnaire/${q.id}` as Route}
                  >
                    {progress === 0 ? "Start" : "Continue"}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
