// Workflow Generation Pipeline Orchestrator
// Manages the end-to-end process of generating workflows from questionnaire submissions

import { ai } from '@horizon/ai';
import { prisma } from '@horizon/db';

// Execution context for workflow generation pipeline
export interface AiExecutionContext {
  tenantId: string;
  scope: string; // e.g. 'ai.workflow.generate'
  requestId: string;
  caller: string; // e.g. 'submission.submit' or 'submission.lock'
}

// Pipeline step interfaces
export interface NormalizedSubmission {
  submissionId: string;
  projectId: string;
  tenantId: string;
  answers: Array<{
    questionId: string;
    questionTitle: string;
    questionType: string;
    value: any;
  }>;
  template: {
    id: string;
    name: string;
  };
}

export interface ResolvedContext {
  projectType: 'website' | 'web-app' | 'saas' | 'custom';
  packageTier: 'basic' | 'pro' | 'custom';
  phaseTemplate: Array<{
    name: string;
    intent: string;
    description?: string;
    estimatedDurationWeeks: number;
  }>;
}

export interface GeneratedWorkflowDraft {
  name: string;
  description?: string;
  phases: Array<{
    name: string;
    intent: string;
    description?: string;
    order: number;
    tasks: Array<{
      title: string;
      description?: string;
      order: number;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      estimatedDurationDays?: number;
    }>;
  }>;
  // Allow additional metadata fields for internal use
  [key: string]: any;
}

export interface GenerationResult {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  workflowId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Main orchestrator for workflow generation from questionnaire submissions
 * Ensures strict pipeline boundaries, idempotency, and never persists invalid workflows
 */
export async function generateWorkflowFromSubmission(
  ctx: AiExecutionContext,
  submissionId: string
): Promise<GenerationResult> {
  try {
    // Step 0: Check for existing generation (idempotency)
    const existingGeneration = await prisma.ai_workflow_generations.findUnique({
      where: {
        tenantId_submissionId: {
          tenantId: ctx.tenantId,
          submissionId,
        },
      },
    });

    if (existingGeneration) {
      // Handle existing generation based on status
      switch (existingGeneration.status) {
        case 'SUCCEEDED':
          return {
            status: 'SUCCEEDED',
            workflowId: existingGeneration.workflowId!,
          };

        case 'PENDING':
          // Another process is working on this - return pending status
          return {
            status: 'PENDING',
            metadata: { existingGenerationId: existingGeneration.id },
          };

        case 'FAILED':
          // Previous attempt failed - could retry, but for now return the failure
          // In future, could add retry logic based on failure reason/timestamp
          return {
            status: 'FAILED',
            errorCode: existingGeneration.errorCode || 'PREVIOUS_FAILURE',
            errorMessage: existingGeneration.errorMessage || 'Previous generation failed',
            metadata: { existingGenerationId: existingGeneration.id },
          };
      }
    }

    // No existing generation - create PENDING record and proceed
    const generationRecord = await prisma.ai_workflow_generations.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: ctx.tenantId,
        submissionId,
        projectId: '', // Will be filled during normalization
        status: 'PENDING',
        requestId: ctx.requestId,
        updatedAt: new Date(),
      },
    });

    try {
      // Step 1: Normalize submission data
      const normalized = await normalizeSubmission(submissionId);
      if (!normalized) {
        await updateGenerationStatus(
          generationRecord.id,
          'FAILED',
          'NORMALIZE_FAILED',
          'Could not normalize submission data'
        );
        return {
          status: 'FAILED',
          errorCode: 'NORMALIZE_FAILED',
          errorMessage: 'Could not normalize submission data',
        };
      }

      // Update project ID in generation record
      await prisma.ai_workflow_generations.update({
        where: { id: generationRecord.id },
        data: { projectId: normalized.projectId },
      });

      // Step 2: Resolve project context (type, package, phases)
      const resolvedContext = await resolveContext(normalized);

      // Step 3: Generate workflow via AI
      const draftWithMetadata = await generateWorkflow(ctx, normalized, resolvedContext);
      if (!draftWithMetadata) {
        await updateGenerationStatus(
          generationRecord.id,
          'FAILED',
          'GENERATE_FAILED',
          'AI generation failed after trying all prompt strategies'
        );
        return {
          status: 'FAILED',
          errorCode: 'GENERATE_FAILED',
          errorMessage: 'AI generation failed after trying all prompt strategies',
          metadata: { generationId: generationRecord.id },
        };
      }

      // Extract metadata and clean the draft for downstream processing
      const generationMetadata = (draftWithMetadata as any)._metadata || {};
      const successfulPromptVersion = generationMetadata.promptVersion || 'v001';
      const { _metadata, ...draft } = draftWithMetadata as any;

      // Step 4: Validate generated workflow
      const validationResult = await validateWorkflow(draft);
      if (!validationResult.isValid) {
        await updateGenerationStatus(
          generationRecord.id,
          'FAILED',
          'VALIDATION_FAILED',
          `Generated workflow failed validation: ${validationResult.errors.join(', ')}`
        );
        return {
          status: 'FAILED',
          errorCode: 'VALIDATION_FAILED',
          errorMessage: 'Generated workflow failed validation',
          metadata: {
            generationId: generationRecord.id,
            validationErrors: validationResult.errors,
          },
        };
      }

      // Step 5: Persist valid workflow
      const persistResult = await persistWorkflow(ctx, submissionId, draft);
      if (!persistResult.workflowId) {
        await updateGenerationStatus(
          generationRecord.id,
          'FAILED',
          'PERSIST_FAILED',
          persistResult.errorMessage || 'Failed to persist workflow'
        );
        return {
          status: 'FAILED',
          errorCode: 'PERSIST_FAILED',
          errorMessage: persistResult.errorMessage || 'Failed to persist workflow',
          metadata: { generationId: generationRecord.id },
        };
      }

      // Success - update generation record
      await prisma.ai_workflow_generations.update({
        where: { id: generationRecord.id },
        data: {
          status: 'SUCCEEDED',
          workflowId: persistResult.workflowId,
          provider: 'openrouter', // TODO: Get from AI metadata
          promptId: 'workflow-generate',
          promptVersion: successfulPromptVersion,
        },
      });

      return {
        status: 'SUCCEEDED',
        workflowId: persistResult.workflowId,
      };
    } catch (error) {
      // Update generation record with failure
      await updateGenerationStatus(
        generationRecord.id,
        'FAILED',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  } catch (error) {
    return {
      status: 'FAILED',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: { requestId: ctx.requestId },
    };
  }
}

// Helper to update generation status
async function updateGenerationStatus(
  generationId: string,
  status: string,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  await prisma.ai_workflow_generations.update({
    where: { id: generationId },
    data: {
      status,
      errorCode,
      errorMessage,
    },
  });
}

// Pipeline step implementations
async function normalizeSubmission(submissionId: string): Promise<NormalizedSubmission | null> {
  const { normalizeSubmission: normalize } = await import('./normalize');
  return normalize(submissionId);
}

async function resolveContext(normalized: NormalizedSubmission): Promise<ResolvedContext> {
  const { resolveContext } = await import('./resolve-context');
  return resolveContext(normalized);
}

async function generateWorkflow(
  ctx: AiExecutionContext,
  normalized: NormalizedSubmission,
  resolved: ResolvedContext
): Promise<GeneratedWorkflowDraft | null> {
  const { generateWorkflow } = await import('./generate');
  return generateWorkflow(ctx, normalized, resolved);
}

async function validateWorkflow(draft: GeneratedWorkflowDraft): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const { validateWorkflow } = await import('./validate');
  return validateWorkflow(draft);
}

async function persistWorkflow(
  ctx: AiExecutionContext,
  submissionId: string,
  draft: GeneratedWorkflowDraft
): Promise<{
  workflowId?: string;
  errorMessage?: string;
}> {
  const { persistWorkflow } = await import('./persist');
  return persistWorkflow(ctx, submissionId, draft);
}
