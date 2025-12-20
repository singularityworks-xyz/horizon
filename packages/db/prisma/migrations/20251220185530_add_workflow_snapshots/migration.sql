-- CreateTable
CREATE TABLE "workflow_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "dependencies" JSONB,
    "timeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "workflow_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_snapshot_phases" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sourcePhaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intent" "PhaseIntent" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_snapshot_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_snapshot_tasks" (
    "id" TEXT NOT NULL,
    "snapshotPhaseId" TEXT NOT NULL,
    "sourceTaskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedDurationDays" INTEGER,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_snapshot_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_snapshot_progress" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "perPhase" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_snapshot_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_snapshots_tenantId_projectId_idx" ON "workflow_snapshots"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_snapshots_tenantId_projectId_isCurrent_key" ON "workflow_snapshots"("tenantId", "projectId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_snapshot_progress_snapshotId_key" ON "workflow_snapshot_progress"("snapshotId");

-- AddForeignKey
ALTER TABLE "workflow_snapshots" ADD CONSTRAINT "workflow_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_snapshots" ADD CONSTRAINT "workflow_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_snapshots" ADD CONSTRAINT "workflow_snapshots_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_snapshots" ADD CONSTRAINT "workflow_snapshots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_snapshot_phases" ADD CONSTRAINT "workflow_snapshot_phases_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "workflow_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_snapshot_tasks" ADD CONSTRAINT "workflow_snapshot_tasks_snapshotPhaseId_fkey" FOREIGN KEY ("snapshotPhaseId") REFERENCES "workflow_snapshot_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_snapshot_progress" ADD CONSTRAINT "workflow_snapshot_progress_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "workflow_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
