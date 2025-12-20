// Gemini Provider Implementation
// Uses Google's Gemini models via the AI SDK

import { google } from '@ai-sdk/google';
import { AiProvider, ModelTier, ProviderId } from './types';

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

    const client = google({ apiKey: this.apiKey });
    const modelId = this.getModelId(tier);
    return client(modelId);
  }

  getModelId(tier: ModelTier): string {
    switch (tier) {
      case ModelTier.FAST:
        // Fast Gemini model
        return 'gemini-1.5-flash';
      case ModelTier.BALANCED:
        // Balanced Gemini model
        return 'gemini-1.5-flash';
      case ModelTier.QUALITY:
        // High-quality Gemini model
        return 'gemini-1.5-pro';
      default:
        throw new Error(`Unknown model tier: ${tier}`);
    }
  }
}
