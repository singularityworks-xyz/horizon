-- CreateEnum
CREATE TYPE "PhaseIntent" AS ENUM ('DISCOVERY', 'DESIGN', 'BUILD', 'TEST', 'DEPLOY', 'MAINTENANCE', 'CUSTOM');

-- AlterTable: extend workflows with edit tracking
ALTER TABLE "workflows"
  ADD COLUMN     "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "lastEditedById" TEXT,
  ADD COLUMN     "lastEditedAt" TIMESTAMP(3);

-- AlterTable: extend phases with intent and edit tracking
ALTER TABLE "phases"
  ADD COLUMN     "intent" "PhaseIntent" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN     "source" "WorkflowSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN     "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "lastEditedById" TEXT,
  ADD COLUMN     "lastEditedAt" TIMESTAMP(3);

-- AlterTable: extend tasks with estimation, milestones, and edit tracking
ALTER TABLE "tasks"
  ADD COLUMN     "estimatedDurationDays" INTEGER,
  ADD COLUMN     "isMilestone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "source" "WorkflowSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN     "isManuallyEdited" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "lastEditedById" TEXT,
  ADD COLUMN     "lastEditedAt" TIMESTAMP(3);

-- CreateTable: task_dependencies
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "fromTaskId" TEXT NOT NULL,
    "toTaskId" TEXT NOT NULL,
    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraint for task dependencies
CREATE UNIQUE INDEX "task_dependencies_fromTaskId_toTaskId_key" ON "task_dependencies"("fromTaskId", "toTaskId");

-- CreateIndex: optimize queries for dependent tasks
CREATE INDEX "task_dependencies_toTaskId_idx" ON "task_dependencies"("toTaskId");

-- AddForeignKey: task dependencies fromTask
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_fromTaskId_fkey" FOREIGN KEY ("fromTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: task dependencies toTask
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_toTaskId_fkey" FOREIGN KEY ("toTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: workflows lastEditedBy
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: phases lastEditedBy
ALTER TABLE "phases" ADD CONSTRAINT "phases_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: tasks lastEditedBy
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
