// Provider abstraction types and interfaces

import type { LanguageModelV1 } from 'ai';

// Supported provider IDs
export type ProviderId = 'openrouter' | 'gemini';

// Model tiers map to different quality/speed tradeoffs
export enum ModelTier {
  FAST = 'fast', // Fast, cost-effective models for simple tasks
  BALANCED = 'balanced', // Good balance of quality and speed
  QUALITY = 'quality', // High-quality models for complex tasks
}

// Provider configuration interface
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string; // For OpenRouter, etc.
}

// Model creation function type
export type ModelFactory = (tier: ModelTier) => any;

// Provider interface - each provider implements this
export interface AiProvider {
  readonly id: ProviderId;
  readonly name: string;

  // Check if provider is properly configured
  isConfigured(): boolean;

  // Create a model instance for the given tier
  createModel(tier: ModelTier): any;

  // Get the actual model identifier used by this provider for a tier
  getModelId(tier: ModelTier): string;
}

// Provider selection result
export interface ProviderSelection {
  provider: AiProvider;
  tier: ModelTier;
  model: any;
  fallbackUsed?: boolean;
}
