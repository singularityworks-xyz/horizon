import { prisma } from '@horizon/db';
import { randomUUID } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import {
  AssetPresignSchema,
  type AssetPresignInput,
  validateAssetContext,
  validateFileSize,
  validateFileType,
} from '@/lib/assets/validation';
import { apiErrors, guards } from '@/lib/security/guards';
import {
  createPresignedUploadUrl,
  generateStorageKey,
  validateStorageConfig,
} from '@/lib/storage/r2';
export const runtime = 'nodejs';

// Context type for asset handlers
export type AssetContext = {
  tenantId: string;
  userId: string;
  role: 'ADMIN';
};

// POST /api/assets/presign - Generate presigned URL for asset upload
export const POST = guards.adminOnly(handlePresign);

// Extracted handler for presign logic (testable without auth)
export async function handlePresign(
  request: NextRequest,
  context: AssetContext,
  params: any
): Promise<NextResponse> {
  try {
    // Check if storage is configured
    if (!validateStorageConfig()) {
      return apiErrors.internalError('File storage not configured');
    }

    const body = await request.json();
    const validatedData = AssetPresignSchema.parse(body);

    // Validate file type and size
    if (!validateFileType(validatedData.mimeType)) {
      return apiErrors.badRequest('Unsupported file type');
    }

    if (!validateFileSize(validatedData.size)) {
      return apiErrors.badRequest(`File size exceeds maximum limit of ${25}MB`);
    }

    // Validate asset context (ensure proper linking)
    if (!validateAssetContext(validatedData)) {
      return apiErrors.badRequest(
        'Invalid asset context - must provide appropriate linking fields'
      );
    }

    // Verify tenant ownership of linked entities
    await validateLinkedEntities(validatedData, context.tenantId);

    // Generate asset ID and storage key
    const assetId = randomUUID();
    const storageKey = generateStorageKey(context.tenantId, assetId, validatedData.fileName);

    // Create presigned upload URL
    const uploadUrl = await createPresignedUploadUrl(
      storageKey,
      validatedData.mimeType,
      validatedData.size
    );

    return NextResponse.json(
      {
        assetId,
        storageKey,
        uploadUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create presigned upload URL:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return apiErrors.badRequest('Invalid request data');
    }

    return apiErrors.internalError('Failed to prepare asset upload');
  }
}

// Validate that linked entities belong to the tenant
async function validateLinkedEntities(data: AssetPresignInput, tenantId: string): Promise<void> {
  const validations = [];

  // Validate project ownership
  if (data.projectId) {
    validations.push(
      prisma.projects
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
      prisma.questions
        .findFirst({
          where: { id: data.questionId, questionnaire_templates: { tenantId } },
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
      prisma.answers
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
      prisma.workflows
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
      prisma.phases
        .findFirst({
          where: { id: data.phaseId, workflows: { tenantId } },
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
      prisma.tasks
        .findFirst({
          where: { id: data.taskId, phases: { workflows: { tenantId } } },
          select: { id: true },
        })
        .then((task) => {
          if (!task) throw new Error('Task not found or access denied');
        })
    );
  }

  await Promise.all(validations);
}
