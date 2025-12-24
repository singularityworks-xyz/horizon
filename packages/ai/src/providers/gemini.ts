// Gemini Provider Implementation
// Uses Google's Gemini models via the AI SDK

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { type AiProvider, ModelTier, type ProviderId } from './types';

export class GeminiProvider implements AiProvider {
  readonly id: ProviderId = 'gemini';
  readonly name = 'Gemini';

  constructor(private readonly apiKey?: string) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  createModel(tier: ModelTier) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const google = createGoogleGenerativeAI({ apiKey: this.apiKey });
    const modelId = this.getModelId(tier);
    return google(modelId);
  }

  getModelId(tier: ModelTier): string {
    switch (tier) {
      case ModelTier.FAST:
        // Fast Gemini model
        return 'gemini-flash-latest';
      case ModelTier.BALANCED:
        // Balanced Gemini model
        return 'gemini-flash-latest';
      case ModelTier.QUALITY:
        // High-quality Gemini model
        return 'gemini-pro-latest';
      default:
        throw new Error(`Unknown model tier: ${tier}`);
    }
  }
}
