// Prompt Registry - manages versioned prompts stored in the repository

import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';

export interface PromptVersion {
  id: string;
  version: string;
  content: string;
  filePath: string;
}

export interface PromptResult {
  id: string;
  version: string;
  content: string;
  sha?: string; // Git commit hash (for future use)
}

export class PromptRegistry {
  private static readonly PROMPTS_DIR = PromptRegistry.resolvePromptsDir();

  private static resolvePromptsDir(): string {
    const fs = require('fs');
    const path = require('path');

    // Candidate paths to check
    const candidates = [
      // 1. Monorepo: from apps/web up to root, then to packages/ai/prompts
      path.join(process.cwd(), '../../packages/ai/prompts'),
      // 2. If cwd is already the monorepo root
      path.join(process.cwd(), 'packages/ai/prompts'),
      // 3. Relative to the compiled file (original logic)
      path.join(__dirname, '../../prompts'),
      // 4. Fallback for different build structures
      path.join(process.cwd(), 'prompts'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    }

    // Fallback to original relative path even if not found, to allow error handling downstream
    return path.join(__dirname, '../../prompts');
  }

  private promptCache = new Map<string, PromptVersion[]>();

  /**
   * Get a prompt by ID and optional version
   * If no version is specified, returns the latest version
   */
  getPrompt(promptId: string, options: { version?: string } = {}): PromptResult {
    const versions = this.getPromptVersions(promptId);

    if (versions.length === 0) {
      throw new Error(`Prompt '${promptId}' not found`);
    }

    // Find the requested version or use latest
    let selectedVersion: PromptVersion;
    if (options.version) {
      selectedVersion = versions.find((v) => v.version === options.version)!;

      if (!selectedVersion) {
        const availableVersions = versions.map((v) => v.version).join(', ');
        throw new Error(
          `Prompt '${promptId}' version '${options.version}' not found. Available versions: ${availableVersions}`
        );
      }
    } else {
      // Use latest version (sorted by version number)
      selectedVersion = versions.sort((a, b) => this.compareVersions(b.version, a.version))[0];
    }

    return {
      id: selectedVersion.id,
      version: selectedVersion.version,
      content: selectedVersion.content,
    };
  }

  /**
   * Get all available versions of a prompt
   */
  getPromptVersions(promptId: string): PromptVersion[] {
    if (this.promptCache.has(promptId)) {
      return this.promptCache.get(promptId)!;
    }

    const promptDir = join(PromptRegistry.PROMPTS_DIR, promptId);

    try {
      const entries = readdirSync(promptDir);
      const versions: PromptVersion[] = [];

      for (const entry of entries) {
        const entryPath = join(promptDir, entry);
        const stat = statSync(entryPath);

        if (stat.isFile() && entry.endsWith('.md')) {
          // Extract version from filename (e.g., "v001.md" -> "v001")
          const versionMatch = entry.match(/^v(\d+)\.md$/);
          if (versionMatch) {
            const version = `v${versionMatch[1]}`;
            const content = readFileSync(entryPath, 'utf-8');

            versions.push({
              id: promptId,
              version,
              content,
              filePath: entryPath,
            });
          }
        }
      }

      // Sort versions numerically
      versions.sort((a, b) => this.compareVersions(a.version, b.version));

      this.promptCache.set(promptId, versions);
      return versions;
    } catch (error) {
      // Directory doesn't exist or can't be read
      // Do not cache failures so that we can retry if the directory is created later
      return [];
    }
  }

  /**
   * Get all available prompt IDs
   */
  getAvailablePrompts(): string[] {
    try {
      const entries = readdirSync(PromptRegistry.PROMPTS_DIR, {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      return [];
    }
  }

  /**
   * Compare version strings (e.g., "v001" < "v002")
   */
  private compareVersions(a: string, b: string): number {
    const aNum = parseInt(a.replace('v', ''));
    const bNum = parseInt(b.replace('v', ''));
    return aNum - bNum;
  }

  /**
   * Clear the cache (useful for testing or when prompts are updated)
   */
  clearCache(): void {
    this.promptCache.clear();
  }
}

// Export singleton instance
export const promptRegistry = new PromptRegistry();
