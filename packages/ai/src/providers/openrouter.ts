// OpenRouter Provider Implementation
// Uses OpenRouter's OpenAI-compatible API

import { createOpenAI } from '@ai-sdk/openai';
import { type AiProvider, ModelTier, type ProviderId } from './types';

export class OpenRouterProvider implements AiProvider {
  readonly id: ProviderId = 'openrouter';
  readonly name = 'OpenRouter';

  constructor(private readonly apiKey?: string) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  createModel(tier: ModelTier) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const client = createOpenAI({
      apiKey: this.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    const modelId = this.getModelId(tier);
    return client(modelId);
  }

  getModelId(tier: ModelTier): string {
    switch (tier) {
      case ModelTier.FAST:
        // Fast and cost-effective model
        return 'anthropic/claude-3-haiku:beta';
      case ModelTier.BALANCED:
        // Good balance of quality and speed
        return 'anthropic/claude-3-sonnet';
      case ModelTier.QUALITY:
        // High-quality model for complex tasks
        return 'anthropic/claude-3-opus';
      default:
        throw new Error(`Unknown model tier: ${tier}`);
    }
  }
}
