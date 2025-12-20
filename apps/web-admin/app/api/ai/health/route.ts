import { NextRequest, NextResponse } from 'next/server';
import { guards, apiErrors } from '@/lib/security/guards';
import { runtime } from '@/lib/api-runtime';
import { ai, validateAiConfiguration } from '@horizon/ai';
import { z } from 'zod';

// Context type for AI handlers
export type AiContext = {
  tenantId: string;
  userId: string;
  role: 'admin' | 'client';
};

// Response schema for health check
const HealthCheckResponseSchema = z.object({
  status: z.literal('healthy'),
  model: z.string(),
  timestamp: z.string(),
  message: z.string(),
  purpose: z.literal('health-check'),
});

// GET /api/ai/health - Check AI integration health
// Query params:
// - mode=config: Only validate configuration (no API calls)
// - mode=full: Make actual AI call for deeper testing (default)
export const GET = guards.authenticated(handleAiHealthCheck);

// Extracted handler for AI health check (testable without auth)
export async function handleAiHealthCheck(
  request: NextRequest,
  context: AiContext
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'full';

    if (mode === 'config') {
      // Config-only mode: validate setup without making API calls
      return await handleConfigHealthCheck(context);
    } else {
      // Full mode: make actual AI call (default behavior)
      return await handleFullHealthCheck(context);
    }
  } catch (error) {
    console.error('AI health check error:', error);
    return apiErrors.internalError('AI integration health check failed');
  }
}

async function handleConfigHealthCheck(context: AiContext): Promise<NextResponse> {
  const validation = await validateAiConfiguration(context.tenantId);

  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AI_CONFIGURATION_INVALID',
          message: 'AI integration configuration issues found',
          details: {
            providers: validation.providers,
            components: validation.components,
            errors: validation.errors,
          },
        },
        metadata: {
          mode: 'config',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }

  // All config checks passed
  return NextResponse.json({
    success: true,
    data: {
      status: 'configured',
      providers: validation.providers,
      components: validation.components,
      message: 'AI integration is properly configured',
      timestamp: new Date().toISOString(),
    },
    metadata: {
      mode: 'config',
      timestamp: new Date().toISOString(),
    },
  });
}

async function handleFullHealthCheck(context: AiContext): Promise<NextResponse> {
  // Execute AI health check task
  const result = await ai.runTask(
    {
      tenantId: context.tenantId,
      taskId: 'health-check',
      promptId: 'health-check',
      input: {
        timestamp: new Date().toISOString(),
      },
      options: {
        tier: 'fast', // Use fast tier for health checks
        maxRetries: 1, // Minimal retries for health checks
        timeoutMs: 10000, // 10 second timeout
      },
    },
    HealthCheckResponseSchema
  );

  if (!result.success) {
    // Return structured error response
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        metadata: {
          ...result.metadata,
          mode: 'full',
        },
      },
      { status: 500 }
    );
  }

  // Return successful health check response
  return NextResponse.json({
    success: true,
    data: result.data,
    metadata: {
      ...result.metadata,
      mode: 'full',
    },
  });
}
