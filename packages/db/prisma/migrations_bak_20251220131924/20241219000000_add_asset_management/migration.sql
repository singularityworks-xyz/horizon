-- CreateEnum
CREATE TYPE "AssetAccessLevel" AS ENUM ('ADMIN_ONLY', 'TENANT', 'PUBLIC');

-- AlterTable: extend assets with linking + access control
ALTER TABLE "assets"
  ADD COLUMN     "answerId" TEXT,
  ADD COLUMN     "workflowId" TEXT,
  ADD COLUMN     "phaseId" TEXT,
  ADD COLUMN     "taskId" TEXT,
  ADD COLUMN     "uploaderId" TEXT,
  ADD COLUMN     "accessLevel" "AssetAccessLevel" NOT NULL DEFAULT 'TENANT';

-- Backfill uploaderId for existing rows (guarded to avoid invalid FK)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "assets" WHERE "uploaderId" IS NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM "users") THEN
      RAISE EXCEPTION 'Cannot backfill assets.uploaderId because no users exist to reference';
    END IF;

    UPDATE "assets"
    SET "uploaderId" = (SELECT "id" FROM "users" ORDER BY "createdAt" LIMIT 1)
    WHERE "uploaderId" IS NULL;
  END IF;
END $$;

-- Enforce NOT NULL on uploaderId
ALTER TABLE "assets"
  ALTER COLUMN "uploaderId" SET NOT NULL;

-- CreateTable: asset_versions
CREATE TABLE "asset_versions" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "changeLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_versions_pkey" PRIMARY KEY ("id")
);

-- Indexes for assets
CREATE INDEX "assets_tenantId_projectId_idx" ON "assets"("tenantId", "projectId");
CREATE INDEX "assets_tenantId_questionId_idx" ON "assets"("tenantId", "questionId");
CREATE INDEX "assets_tenantId_answerId_idx" ON "assets"("tenantId", "answerId");
CREATE INDEX "assets_tenantId_workflowId_idx" ON "assets"("tenantId", "workflowId");
CREATE INDEX "assets_tenantId_phaseId_idx" ON "assets"("tenantId", "phaseId");
CREATE INDEX "assets_tenantId_taskId_idx" ON "assets"("tenantId", "taskId");
CREATE INDEX "assets_tenantId_uploaderId_idx" ON "assets"("tenantId", "uploaderId");
CREATE INDEX "assets_accessLevel_idx" ON "assets"("accessLevel");

-- Indexes for asset_versions
CREATE INDEX "asset_versions_assetId_idx" ON "asset_versions"("assetId");
CREATE INDEX "asset_versions_assetId_version_idx" ON "asset_versions"("assetId", "version");
CREATE UNIQUE INDEX "asset_versions_assetId_version_key" ON "asset_versions"("assetId", "version");

-- Foreign keys for assets
ALTER TABLE "assets" ADD CONSTRAINT "assets_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys for asset_versions
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

