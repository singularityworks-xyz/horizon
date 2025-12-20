// AI Integration Error Types and Codes
// Provides stable error codes for consistent error handling across the application

export enum AiErrorCode {
  // Provider errors
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  AI_PROVIDER_TIMEOUT = 'AI_PROVIDER_TIMEOUT',
  AI_PROVIDER_RATE_LIMITED = 'AI_PROVIDER_RATE_LIMITED',

  // Rate limiting
  AI_RATE_LIMITED = 'AI_RATE_LIMITED',

  // Input validation
  AI_BAD_INPUT = 'AI_BAD_INPUT',
  AI_INVALID_PROMPT = 'AI_INVALID_PROMPT',

  // Output processing
  AI_PARSE_ERROR = 'AI_PARSE_ERROR',
  AI_OUTPUT_VALIDATION_FAILED = 'AI_OUTPUT_VALIDATION_FAILED',

  // Configuration
  AI_MISSING_CONFIGURATION = 'AI_MISSING_CONFIGURATION',

  // Internal errors
  AI_INTERNAL_ERROR = 'AI_INTERNAL_ERROR',
}

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AiError';
  }

  static providerError(provider: string, cause: Error): AiError {
    return new AiError(
      AiErrorCode.AI_PROVIDER_ERROR,
      `Provider ${provider} failed: ${cause.message}`,
      { provider, cause: cause.message }
    );
  }

  static rateLimited(tenantId: string, scope: string, resetIn: number): AiError {
    return new AiError(AiErrorCode.AI_RATE_LIMITED, 'Rate limit exceeded', {
      tenantId,
      scope,
      resetIn,
    });
  }

  static badInput(field: string, reason: string): AiError {
    return new AiError(AiErrorCode.AI_BAD_INPUT, `Invalid input: ${field} - ${reason}`, {
      field,
      reason,
    });
  }

  static parseError(expected: string, received: string): AiError {
    return new AiError(
      AiErrorCode.AI_PARSE_ERROR,
      `Failed to parse AI output. Expected: ${expected}, received: ${received}`,
      { expected, received }
    );
  }

  static timeout(provider: string, timeoutMs: number): AiError {
    return new AiError(
      AiErrorCode.AI_PROVIDER_TIMEOUT,
      `Provider ${provider} timed out after ${timeoutMs}ms`,
      { provider, timeoutMs }
    );
  }

  static missingConfiguration(provider: string, requiredKeys: string[]): AiError {
    return new AiError(
      AiErrorCode.AI_MISSING_CONFIGURATION,
      `Missing configuration for provider ${provider}. Required: ${requiredKeys.join(', ')}`,
      { provider, requiredKeys }
    );
  }
}
