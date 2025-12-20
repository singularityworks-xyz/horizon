import { describe, it, expect, beforeEach, vi } from 'vitest';
import { selectProvider, ModelTier } from '../providers';

// Mock the environment variables
vi.mock('@horizon/config', () => ({
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
      vi.mocked('@horizon/config').env.OPENROUTER_API_KEY = undefined;

      const result = selectProvider(undefined, ModelTier.QUALITY);

      expect(result.provider.id).toBe('gemini');
      expect(result.tier).toBe(ModelTier.QUALITY);
      expect(result.fallbackUsed).toBe(true);

      // Restore mock
      vi.mocked('@horizon/config').env.OPENROUTER_API_KEY = 'test-openrouter-key';
    });

    it('should throw error when no providers configured', () => {
      // Mock both providers as not configured
      vi.mocked('@horizon/config').env.OPENROUTER_API_KEY = undefined;
      vi.mocked('@horizon/config').env.GEMINI_API_KEY = undefined;

      expect(() => {
        selectProvider(undefined, ModelTier.BALANCED);
      }).toThrow('No AI providers are configured');

      // Restore mocks
      vi.mocked('@horizon/config').env.OPENROUTER_API_KEY = 'test-openrouter-key';
      vi.mocked('@horizon/config').env.GEMINI_API_KEY = 'test-gemini-key';
    });
  });
});
