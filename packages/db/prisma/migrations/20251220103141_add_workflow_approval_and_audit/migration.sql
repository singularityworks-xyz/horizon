-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "aiApprovalNotes" TEXT,
ADD COLUMN     "aiApprovedAt" TIMESTAMP(3),
ADD COLUMN     "aiApprovedById" TEXT,
ADD COLUMN     "aiGeneratedFromSubmissionId" TEXT;

-- CreateTable
CREATE TABLE "ai_workflow_generations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "workflowId" TEXT,
    "provider" TEXT,
    "promptId" TEXT,
    "promptVersion" TEXT,
    "requestId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_workflow_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_workflow_generations_tenantId_submissionId_key" ON "ai_workflow_generations"("tenantId", "submissionId");

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_aiApprovedById_fkey" FOREIGN KEY ("aiApprovedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_generations" ADD CONSTRAINT "ai_workflow_generations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_generations" ADD CONSTRAINT "ai_workflow_generations_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "questionnaire_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_generations" ADD CONSTRAINT "ai_workflow_generations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_generations" ADD CONSTRAINT "ai_workflow_generations_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;
