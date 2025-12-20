// Step 3: Generate workflow via AI
// Constructs prompt from normalized data and calls AI to generate workflow structure

import { ai } from '@horizon/ai';
import { z } from 'zod';
import type {
  AiExecutionContext,
  NormalizedSubmission,
  ResolvedContext,
  GeneratedWorkflowDraft,
} from './index';

// Schema for AI-generated workflow structure
const AiWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  phases: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        intent: z.enum(['DISCOVERY', 'DESIGN', 'BUILD', 'TEST', 'DEPLOY', 'MAINTENANCE', 'CUSTOM']),
        description: z.string().optional(),
        order: z.number().int().min(0),
        tasks: z
          .array(
            z.object({
              title: z.string().min(1).max(255),
              description: z.string().optional(),
              order: z.number().int().min(0),
              priority: z.enum(['low', 'medium', 'high', 'urgent']),
              estimatedDurationDays: z.number().int().min(1).optional(),
            })
          )
          .min(1), // Each phase must have at least 1 task
      })
    )
    .min(1), // Must have at least 1 phase
});

// Retry strategy: Try different prompt versions in order of preference
const PROMPT_STRATEGY = [
  { version: 'v001', description: 'Comprehensive detailed approach' },
  { version: 'v002', description: 'Structured step-by-step approach' },
  { version: 'v003', description: 'Simplified direct approach' },
];

export async function generateWorkflow(
  ctx: AiExecutionContext,
  normalized: NormalizedSubmission,
  resolved: ResolvedContext
): Promise<GeneratedWorkflowDraft | null> {
  const errors: Array<{ promptVersion: string; error: string; metadata?: any }> = [];

  // Try different prompt strategies in order
  for (const strategy of PROMPT_STRATEGY) {
    try {
      console.log(
        `Attempting workflow generation with prompt ${strategy.version} (${strategy.description})`,
        {
          requestId: ctx.requestId,
          submissionId: normalized.submissionId,
        }
      );

      // Call AI with this prompt version
      const result = await ai.runTask(
        {
          tenantId: ctx.tenantId,
          taskId: 'workflow.generate',
          promptId: `workflow-generate/${strategy.version}`,
          input: {
            projectType: resolved.projectType,
            packageTier: resolved.packageTier,
            answers: constructAnswersText(normalized),
          },
          options: {
            tier: 'quality', // Use quality model for complex workflow generation
            maxRetries: 1, // Single retry per prompt version (we're doing multi-prompt retry)
            timeoutMs: 45000, // 45 seconds for complex generation
          },
        },
        AiWorkflowSchema
      );

      if (!result.success) {
        const errorMsg = `Prompt ${strategy.version} failed: ${result.error?.message || 'Unknown error'}`;
        console.warn(errorMsg, {
          requestId: ctx.requestId,
          submissionId: normalized.submissionId,
          metadata: result.metadata,
        });
        errors.push({
          promptVersion: strategy.version,
          error: errorMsg,
          metadata: result.metadata,
        });
        continue; // Try next prompt version
      }

      // Validate the response structure
      if (!result.data || typeof result.data !== 'object') {
        const errorMsg = `Prompt ${strategy.version} returned invalid structure`;
        console.warn(errorMsg, {
          requestId: ctx.requestId,
          data: result.data,
        });
        errors.push({
          promptVersion: strategy.version,
          error: errorMsg,
        });
        continue; // Try next prompt version
      }

      // Success! Log which prompt version worked
      console.log(`Workflow generation succeeded with prompt ${strategy.version}`, {
        requestId: ctx.requestId,
        submissionId: normalized.submissionId,
        workflowName: (result.data as any).name,
      });

      // Return the successful result with prompt version metadata
      return {
        ...(result.data as GeneratedWorkflowDraft),
        _metadata: {
          promptVersion: strategy.version,
          generationStrategy: strategy.description,
        },
      } as GeneratedWorkflowDraft;
    } catch (error) {
      const errorMsg = `Prompt ${strategy.version} threw exception: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg, {
        requestId: ctx.requestId,
        submissionId: normalized.submissionId,
        error,
      });
      errors.push({
        promptVersion: strategy.version,
        error: errorMsg,
      });
      continue; // Try next prompt version
    }
  }

  // All prompt strategies failed
  console.error('All workflow generation prompt strategies failed', {
    requestId: ctx.requestId,
    submissionId: normalized.submissionId,
    errors,
  });

  return null;
}

// Helper to construct answers text for prompt input
function constructAnswersText(normalized: NormalizedSubmission): string {
  return normalized.answers
    .map((answer) => {
      const valueStr = Array.isArray(answer.value) ? answer.value.join(', ') : String(answer.value);
      return `${answer.questionTitle}: ${valueStr}`;
    })
    .join('\n');
}
