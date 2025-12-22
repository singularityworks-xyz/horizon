import { describe, expect, it, vi } from 'vitest';
import { ModelTier, selectProvider } from '../providers';
import { env } from '@horizon/config/src/env';

// Mock the environment variables
vi.mock('@horizon/config/src/env', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-openrouter-key',
    GEMINI_API_KEY: 'test-gemini-key',
  },
}));

describe('Provider Selection', () => {
  describe('selectProvider', () => {
    it('should prefer OpenRouter when available and no preference specified', () => {
      const result = selectProvider(undefined, ModelTier.BALANCED);

      expect(result.provider.id).toBe('openrouter');
      expect(result.tier).toBe(ModelTier.BALANCED);
      expect(result.fallbackUsed).toBeUndefined();
    });

    it('should use preferred provider when available', () => {
      const result = selectProvider('openrouter', ModelTier.FAST);

      expect(result.provider.id).toBe('openrouter');
      expect(result.tier).toBe(ModelTier.FAST);
    });

    it('should fallback to Gemini when OpenRouter not configured', () => {
      // Temporarily mock config to not have OpenRouter
      (env as any).OPENROUTER_API_KEY = undefined;

      const result = selectProvider(undefined, ModelTier.QUALITY);

      expect(result.provider.id).toBe('gemini');
      expect(result.tier).toBe(ModelTier.QUALITY);
      expect(result.fallbackUsed).toBe(true);

      // Restore mock
      (env as any).OPENROUTER_API_KEY = 'test-openrouter-key';
    });

    it('should throw error when no providers configured', () => {
      // Mock both providers as not configured
      (env as any).OPENROUTER_API_KEY = undefined;
      (env as any).GEMINI_API_KEY = undefined;

      expect(() => {
        selectProvider(undefined, ModelTier.BALANCED);
      }).toThrow('No AI providers are configured');

      // Restore mocks
      (env as any).OPENROUTER_API_KEY = 'test-openrouter-key';
      (env as any).GEMINI_API_KEY = 'test-gemini-key';
    });
  });
});
