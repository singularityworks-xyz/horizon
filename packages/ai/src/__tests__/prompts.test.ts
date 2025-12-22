import { beforeEach, describe, expect, it } from 'vitest';
import { promptRegistry } from '../prompts/registry';

describe('PromptRegistry', () => {
  beforeEach(() => {
    // Clear cache between tests
    promptRegistry.clearCache();
  });

  describe('getPrompt', () => {
    it('should return the latest version when no version specified', () => {
      const result = promptRegistry.getPrompt('health-check');

      expect(result.id).toBe('health-check');
      expect(result.version).toBe('v001');
      expect(result.content).toContain('AI Health Check Prompt');
    });

    it('should return specific version when requested', () => {
      const result = promptRegistry.getPrompt('health-check', {
        version: 'v001',
      });

      expect(result.id).toBe('health-check');
      expect(result.version).toBe('v001');
      expect(result.content).toContain('AI Health Check Prompt');
    });

    it('should throw error for non-existent prompt', () => {
      expect(() => {
        promptRegistry.getPrompt('non-existent-prompt');
      }).toThrow("Prompt 'non-existent-prompt' not found");
    });

    it('should throw error for non-existent version', () => {
      expect(() => {
        promptRegistry.getPrompt('health-check', { version: 'v999' });
      }).toThrow("Prompt 'health-check' version 'v999' not found");
    });
  });

  describe('getPromptVersions', () => {
    it('should return all versions for existing prompt', () => {
      const versions = promptRegistry.getPromptVersions('health-check');

      expect(versions).toHaveLength(1);
      expect(versions[0].id).toBe('health-check');
      expect(versions[0].version).toBe('v001');
    });

    it('should return empty array for non-existent prompt', () => {
      const versions = promptRegistry.getPromptVersions('non-existent');

      expect(versions).toEqual([]);
    });
  });

  describe('getAvailablePrompts', () => {
    it('should return available prompt IDs', () => {
      const prompts = promptRegistry.getAvailablePrompts();

      expect(prompts).toContain('health-check');
      expect(prompts).toBeInstanceOf(Array);
    });
  });
});
