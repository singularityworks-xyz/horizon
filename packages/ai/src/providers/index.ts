// Provider exports and selection logic

export * from './types';
export { OpenRouterProvider } from './openrouter';
export { GeminiProvider } from './gemini';

import { AiProvider, ProviderId, ProviderSelection, ModelTier } from './types';
import { OpenRouterProvider } from './openrouter';
import { GeminiProvider } from './gemini';

// Provider configuration from environment
import { env } from '@horizon/config';
const openRouterApiKey = env.OPENROUTER_API_KEY;
const geminiApiKey = env.GEMINI_API_KEY;

// Initialize providers
export const openRouterProvider = new OpenRouterProvider(openRouterApiKey);
export const geminiProvider = new GeminiProvider(geminiApiKey);

// Provider registry
const providers: Record<ProviderId, AiProvider> = {
  openrouter: openRouterProvider,
  gemini: geminiProvider,
};

// Provider selection policy
export function selectProvider(
  preferredProvider?: ProviderId,
  tier: ModelTier = ModelTier.BALANCED
): ProviderSelection {
  // Try preferred provider first, if specified and configured
  if (preferredProvider && providers[preferredProvider].isConfigured()) {
    const provider = providers[preferredProvider];
    return {
      provider,
      tier,
      model: provider.createModel(tier),
    };
  }

  // Try OpenRouter first (primary)
  if (openRouterProvider.isConfigured()) {
    return {
      provider: openRouterProvider,
      tier,
      model: openRouterProvider.createModel(tier),
    };
  }

  // Fallback to Gemini
  if (geminiProvider.isConfigured()) {
    return {
      provider: geminiProvider,
      tier,
      model: geminiProvider.createModel(tier),
      fallbackUsed: true,
    };
  }

  // No providers configured
  throw new Error(
    'No AI providers are configured. Please set OPENROUTER_API_KEY or GEMINI_API_KEY.'
  );
}
