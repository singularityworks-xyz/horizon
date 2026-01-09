/*
  Warnings:

  - A unique constraint covering the columns `[projectQuestionnaireId,questionId]` on the table `answer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "answer_projectQuestionnaireId_questionId_key" ON "answer"("projectQuestionnaireId", "questionId");
