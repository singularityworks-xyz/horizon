import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@horizon/db';
import { guards, apiErrors } from '@/lib/security/guards';
import { AssetCompleteSchema, AssetPresignSchema } from '@/lib/assets/validation';
import { scanForViruses, validateScanResult } from '@/lib/assets/virus-scan';
import { createPresignedDownloadUrl, validateStorageConfig } from '@/lib/storage/r2';
import { runtime } from '@/lib/api-runtime';

// Context type for asset handlers
export type AssetContext = {
  tenantId: string;
  userId: string;
  role: 'admin';
};

// POST /api/assets/complete - Complete asset upload after verification
export const POST = guards.adminOnly(handleComplete);

// Extracted handler for complete logic (testable without auth)
export async function handleComplete(
  request: NextRequest,
  context: AssetContext
): Promise<NextResponse> {
  try {
    // Check if storage is configured
    if (!validateStorageConfig()) {
      return apiErrors.internalError('File storage not configured');
    }

    // Extended complete schema that includes presign data
    const AssetCompleteWithPresignSchema = AssetCompleteSchema.extend({
      presignData: AssetPresignSchema,
      assetId: z.string().cuid(),
    });

    const body = await request.json();
    const validatedData = AssetCompleteWithPresignSchema.parse(body);
    const { presignData, assetId, storageKey, checksum, virusScanResult } = validatedData;

    // Perform virus scan
    const scanResult = await scanForViruses(storageKey, presignData.mimeType, presignData.size);

    // Validate scan result
    if (!validateScanResult(scanResult)) {
      return apiErrors.badRequest('File failed security scan');
    }

    // Verify tenant and asset ID match from storage key
    const tenantIdFromKey = extractTenantIdFromStorageKey(storageKey);
    if (!tenantIdFromKey || tenantIdFromKey !== context.tenantId) {
      return apiErrors.forbidden('Asset does not belong to this tenant');
    }

    const assetIdFromKey = extractAssetIdFromStorageKey(storageKey);
    if (assetIdFromKey !== assetId) {
      return apiErrors.badRequest('Asset ID mismatch');
    }

    // Re-validate linked entities (double check)
    await validateLinkedEntities(presignData, context.tenantId);

    // Create the asset record
    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        tenantId: context.tenantId,
        uploaderId: context.userId,
        name: presignData.fileName,
        fileName: presignData.fileName,
        mimeType: presignData.mimeType,
        size: presignData.size,
        checksum: checksum,
        storageKey: storageKey,
        accessLevel: presignData.accessLevel,
        projectId: presignData.projectId || null,
        questionId: presignData.questionId || null,
        answerId: presignData.answerId || null,
        workflowId: presignData.workflowId || null,
        phaseId: presignData.phaseId || null,
        taskId: presignData.taskId || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        question: { select: { id: true, title: true } },
        answer: { select: { id: true } },
        workflow: { select: { id: true, name: true } },
        phase: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        uploader: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Create initial asset version
    await prisma.assetVersion.create({
      data: {
        assetId: asset.id,
        version: 1,
        checksum: checksum,
        size: presignData.size,
        storageKey: storageKey,
        changeLog: 'Initial upload',
      },
    });

    // Generate download URL
    const downloadUrl = await createPresignedDownloadUrl(storageKey);

    return NextResponse.json({
      asset,
      downloadUrl,
      expiresAt: new Date(Date.now() + 300 * 1000).toISOString(), // 5 minutes
    });
  } catch (error) {
    console.error('Failed to complete asset upload:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid request data');
    }

    return apiErrors.internalError('Failed to complete asset upload');
  }
}

// Extract tenant ID from storage key pattern: tenants/{tenantId}/assets/{assetId}/...
function extractTenantIdFromStorageKey(storageKey: string): string | null {
  const match = storageKey.match(/^tenants\/([^\/]+)\/assets\//);
  return match ? match[1] : null;
}

// Extract asset ID from storage key pattern: tenants/{tenantId}/assets/{assetId}/...
function extractAssetIdFromStorageKey(storageKey: string): string | null {
  const match = storageKey.match(/^tenants\/[^\/]+\/assets\/([^\/]+)\//);
  return match ? match[1] : null;
}

// Validate that linked entities belong to the tenant
async function validateLinkedEntities(
  data: typeof AssetPresignSchema._type,
  tenantId: string
): Promise<void> {
  const validations = [];

  // Validate project ownership
  if (data.projectId) {
    validations.push(
      prisma.project
        .findFirst({
          where: { id: data.projectId, tenantId },
          select: { id: true },
        })
        .then((project) => {
          if (!project) throw new Error('Project not found or access denied');
        })
    );
  }

  // Validate question ownership
  if (data.questionId) {
    validations.push(
      prisma.question
        .findFirst({
          where: { id: data.questionId, template: { tenantId } },
          select: { id: true },
        })
        .then((question) => {
          if (!question) throw new Error('Question not found or access denied');
        })
    );
  }

  // Validate answer ownership
  if (data.answerId) {
    validations.push(
      prisma.answer
        .findFirst({
          where: { id: data.answerId, tenantId },
          select: { id: true },
        })
        .then((answer) => {
          if (!answer) throw new Error('Answer not found or access denied');
        })
    );
  }

  // Validate workflow ownership
  if (data.workflowId) {
    validations.push(
      prisma.workflow
        .findFirst({
          where: { id: data.workflowId, tenantId },
          select: { id: true },
        })
        .then((workflow) => {
          if (!workflow) throw new Error('Workflow not found or access denied');
        })
    );
  }

  // Validate phase ownership
  if (data.phaseId) {
    validations.push(
      prisma.phase
        .findFirst({
          where: { id: data.phaseId, workflow: { tenantId } },
          select: { id: true },
        })
        .then((phase) => {
          if (!phase) throw new Error('Phase not found or access denied');
        })
    );
  }

  // Validate task ownership
  if (data.taskId) {
    validations.push(
      prisma.task
        .findFirst({
          where: { id: data.taskId, phase: { workflow: { tenantId } } },
          select: { id: true },
        })
        .then((task) => {
          if (!task) throw new Error('Task not found or access denied');
        })
    );
  }

  await Promise.all(validations);
}

export { runtime };
