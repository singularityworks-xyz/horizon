// AI Orchestration Layer for Horizon
// Provides provider abstraction, rate limiting, prompt versioning, and error handling

import { generateId, generateText } from 'ai';
import { z } from 'zod';
import { AiError, AiErrorCode } from './errors';
import { selectProvider, ModelTier } from './providers';
import { rateLimiter } from './rate-limit';
import { promptRegistry } from './prompts';

export * from './errors';
export * from './providers/types';

// Main orchestration interface
export interface AiTaskInput {
  tenantId: string;
  taskId: string;
  promptId: string;
  promptVersion?: string;
  input: Record<string, unknown>;
  options?: {
    tier?: ModelTier;
    preferredProvider?: 'openrouter' | 'gemini';
    maxRetries?: number;
    timeoutMs?: number;
  };
}

export interface AiTaskResult<T = unknown> {
  success: true;
  data: T;
  metadata: {
    provider: string;
    model: string;
    promptVersion: string;
    requestId: string;
    tokensUsed?: number;
    executionTimeMs: number;
  };
}

export interface AiTaskError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    requestId: string;
    provider?: string;
    promptVersion?: string;
    executionTimeMs?: number;
  };
}

export type AiTaskResponse<T = unknown> = AiTaskResult<T> | AiTaskError;

// Execution context for a single AI task
interface ExecutionContext {
  requestId: string;
  tenantId: string;
  taskId: string;
  startTime: number;
  promptVersion: string;
}

// Main orchestrator class
export class AiOrchestrator {
  private readonly DEFAULT_MAX_RETRIES = 2;
  private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

  async runTask<T = unknown>(
    input: AiTaskInput,
    outputSchema?: z.ZodSchema<T>
  ): Promise<AiTaskResponse<T>> {
    const requestId = generateId();
    const startTime = Date.now();

    try {
      // 1. Rate limiting check
      const rateLimitResult = await rateLimiter.checkAndConsume(
        input.tenantId,
        `ai.${input.taskId}`
      );

      if (!rateLimitResult.allowed) {
        return this.createErrorResponse(
          requestId,
          AiError.rateLimited(input.tenantId, `ai.${input.taskId}`, rateLimitResult.resetIn),
          { executionTimeMs: Date.now() - startTime }
        );
      }

      // 2. Get prompt
      const prompt = promptRegistry.getPrompt(input.promptId, {
        version: input.promptVersion,
      });

      // 3. Select provider
      const providerSelection = selectProvider(
        input.options?.preferredProvider,
        input.options?.tier || ModelTier.BALANCED
      );

      const context: ExecutionContext = {
        requestId,
        tenantId: input.tenantId,
        taskId: input.taskId,
        startTime,
        promptVersion: prompt.version,
      };

      // 4. Execute with retries and fallbacks
      const result = await this.executeWithFallbacks(
        context,
        providerSelection,
        prompt.content,
        input.input,
        input.options
      );

      // 5. Validate output if schema provided
      if (outputSchema && result.success) {
        const validationResult = outputSchema.safeParse(result.data);
        if (!validationResult.success) {
          return this.createErrorResponse(
            requestId,
            AiError.parseError(outputSchema._def.typeName, JSON.stringify(result.data)),
            {
              provider: result.metadata.provider,
              promptVersion: prompt.version,
              executionTimeMs: result.metadata.executionTimeMs,
              validationErrors: validationResult.error.errors,
            }
          );
        }

        return {
          ...result,
          data: validationResult.data as T,
        };
      }

      return result;
    } catch (error) {
      return this.createErrorResponse(
        requestId,
        error instanceof AiError
          ? error
          : new AiError(
              AiErrorCode.AI_INTERNAL_ERROR,
              `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { cause: error }
            ),
        { executionTimeMs: Date.now() - startTime }
      );
    }
  }

  private async executeWithFallbacks(
    context: ExecutionContext,
    initialProvider: any,
    prompt: string,
    input: Record<string, unknown>,
    options?: AiTaskInput['options']
  ): Promise<AiTaskResponse> {
    const maxRetries = options?.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const timeoutMs = options?.timeoutMs ?? this.DEFAULT_TIMEOUT_MS;

    let lastError: AiError | null = null;
    let attempts = 0;

    // Try with initial provider
    const providersToTry = [
      initialProvider,
      // Fallback providers if initial fails
      initialProvider.provider.id === 'openrouter'
        ? selectProvider('gemini', initialProvider.tier)
        : selectProvider('openrouter', initialProvider.tier),
    ];

    for (const providerSelection of providersToTry) {
      if (attempts >= maxRetries + 1) break; // +1 for initial attempt

      try {
        const result = await this.executeWithProvider(
          context,
          providerSelection,
          prompt,
          input,
          timeoutMs
        );

        return result;
      } catch (error) {
        lastError =
          error instanceof AiError
            ? error
            : new AiError(
                AiErrorCode.AI_PROVIDER_ERROR,
                `Provider execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { provider: providerSelection.provider.id }
              );

        attempts++;

        // If this wasn't the last attempt, continue to next provider
        if (attempts <= maxRetries) {
          continue;
        }
      }
    }

    // All providers failed
    return this.createErrorResponse(
      context.requestId,
      lastError || new AiError(AiErrorCode.AI_PROVIDER_ERROR, 'All providers failed'),
      {
        provider: 'multiple',
        promptVersion: context.promptVersion,
        attempts,
        executionTimeMs: Date.now() - context.startTime,
      }
    );
  }

  private async executeWithProvider(
    context: ExecutionContext,
    providerSelection: any,
    prompt: string,
    input: Record<string, unknown>,
    timeoutMs: number
  ): Promise<AiTaskResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    try {
      // Format the prompt with input variables
      const formattedPrompt = this.formatPrompt(prompt, input);

      // Execute the AI call using the AI SDK
      const response = await Promise.race([
        generateText({
          model: providerSelection.model,
          prompt: formattedPrompt,
        }),
        timeoutPromise,
      ]);

      return {
        success: true,
        data: response.text,
        metadata: {
          provider: providerSelection.provider.id,
          model: providerSelection.provider.getModelId(providerSelection.tier),
          promptVersion: context.promptVersion,
          requestId: context.requestId,
          executionTimeMs: Date.now() - context.startTime,
          tokensUsed: response.usage?.totalTokens,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        throw AiError.timeout(providerSelection.provider.id, timeoutMs);
      }

      throw AiError.providerError(providerSelection.provider.id, error as Error);
    }
  }

  private formatPrompt(template: string, variables: Record<string, unknown>): string {
    // Simple variable substitution - can be enhanced with more sophisticated templating
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  private createErrorResponse(
    requestId: string,
    error: AiError,
    additionalMetadata: Record<string, unknown> = {}
  ): AiTaskError {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      metadata: {
        requestId,
        ...additionalMetadata,
      },
    };
  }
}

// Configuration validation interface
export interface ConfigValidationResult {
  valid: boolean;
  providers: {
    openRouter: boolean;
    gemini: boolean;
    primary?: string;
  };
  components: {
    rateLimiter: boolean;
    promptRegistry: boolean;
    database: boolean;
  };
  errors?: string[];
}

// Singleton instance
export const ai = new AiOrchestrator();

// Config validation helper (used by health checks)
export async function validateAiConfiguration(tenantId?: string): Promise<ConfigValidationResult> {
  const { env } = await import('@horizon/config');
  const { rateLimiter } = await import('./rate-limit');
  const { promptRegistry } = await import('./prompts');

  const result: ConfigValidationResult = {
    valid: true,
    providers: {
      openRouter: Boolean(env.OPENROUTER_API_KEY),
      gemini: Boolean(env.GEMINI_API_KEY),
    },
    components: {
      rateLimiter: true,
      promptRegistry: true,
      database: true,
    },
    errors: [],
  };

  // Check providers
  if (!result.providers.openRouter && !result.providers.gemini) {
    result.valid = false;
    result.errors!.push('No AI providers configured');
  } else {
    result.providers.primary = result.providers.openRouter ? 'openrouter' : 'gemini';
  }

  // Check rate limiter (database)
  if (tenantId) {
    try {
      await rateLimiter.getStatus(tenantId, 'ai.health-check');
    } catch (error) {
      result.valid = false;
      result.components.database = false;
      result.errors!.push('Database connection failed');
    }
  }

  // Check prompt registry
  try {
    const prompts = promptRegistry.getAvailablePrompts();
    if (!prompts.includes('health-check')) {
      result.valid = false;
      result.components.promptRegistry = false;
      result.errors!.push('Health check prompt not available');
    }
  } catch (error) {
    result.valid = false;
    result.components.promptRegistry = false;
    result.errors!.push('Prompt registry failed');
  }

  return result;
}
