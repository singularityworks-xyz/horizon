// Step 2: Resolve project context from normalized answers
// Determines project type, package tier, and loads phase templates (hybrid config)

import { prisma } from '@horizon/db';
import type { NormalizedSubmission, ResolvedContext } from './index';

// Repo defaults (shipped with code, can be updated via deployments)
const REPO_DEFAULTS = {
  projectTypes: {
    website: {
      keywords: ['website', 'site', 'web presence', 'landing page'],
      phases: [
        {
          name: 'Discovery & Planning',
          intent: 'DISCOVERY',
          description: 'Requirements gathering and project planning',
          estimatedDurationWeeks: 1,
        },
        {
          name: 'Design',
          intent: 'DESIGN',
          description: 'UI/UX design and wireframes',
          estimatedDurationWeeks: 2,
        },
        {
          name: 'Development',
          intent: 'BUILD',
          description: 'Frontend and backend development',
          estimatedDurationWeeks: 4,
        },
        {
          name: 'Testing & Launch',
          intent: 'TEST',
          description: 'Testing, deployment, and launch',
          estimatedDurationWeeks: 1,
        },
      ],
    },
    'web-app': {
      keywords: ['web app', 'application', 'software', 'platform'],
      phases: [
        {
          name: 'Discovery & Planning',
          intent: 'DISCOVERY',
          description: 'Requirements and technical planning',
          estimatedDurationWeeks: 2,
        },
        {
          name: 'Architecture & Design',
          intent: 'DESIGN',
          description: 'System design and UI/UX',
          estimatedDurationWeeks: 3,
        },
        {
          name: 'Development',
          intent: 'BUILD',
          description: 'Full-stack development and integration',
          estimatedDurationWeeks: 6,
        },
        {
          name: 'Testing & Deployment',
          intent: 'TEST',
          description: 'QA, security testing, and production deployment',
          estimatedDurationWeeks: 2,
        },
      ],
    },
    saas: {
      keywords: ['saas', 'subscription', 'multi-tenant', 'platform'],
      phases: [
        {
          name: 'Discovery & Planning',
          intent: 'DISCOVERY',
          description: 'Business requirements and technical architecture',
          estimatedDurationWeeks: 3,
        },
        {
          name: 'MVP Design & Development',
          intent: 'BUILD',
          description: 'Core functionality and user management',
          estimatedDurationWeeks: 8,
        },
        {
          name: 'Advanced Features',
          intent: 'BUILD',
          description: 'Subscription, billing, and advanced features',
          estimatedDurationWeeks: 6,
        },
        {
          name: 'Launch & Optimization',
          intent: 'DEPLOY',
          description: 'Production deployment and performance optimization',
          estimatedDurationWeeks: 3,
        },
      ],
    },
    custom: {
      keywords: [], // Default fallback
      phases: [
        {
          name: 'Planning',
          intent: 'DISCOVERY',
          description: 'Project planning and requirements',
          estimatedDurationWeeks: 2,
        },
        {
          name: 'Implementation',
          intent: 'BUILD',
          description: 'Custom development work',
          estimatedDurationWeeks: 6,
        },
        {
          name: 'Testing & Delivery',
          intent: 'TEST',
          description: 'Quality assurance and delivery',
          estimatedDurationWeeks: 2,
        },
      ],
    },
  },
  packageTiers: {
    basic: { maxFeatures: 5, supportLevel: 'email' },
    pro: { maxFeatures: 15, supportLevel: 'chat+email' },
    custom: { maxFeatures: 100, supportLevel: 'dedicated' },
  },
};

export async function resolveContext(normalized: NormalizedSubmission): Promise<ResolvedContext> {
  // Step 1: Determine project type from answers
  const projectType = await determineProjectType(normalized);

  // Step 2: Determine package tier from answers
  const packageTier = await determinePackageTier(normalized);

  // Step 3: Load phase template (hybrid: DB override or repo default)
  const phaseTemplate = await loadPhaseTemplate(normalized.tenantId, projectType);

  return {
    projectType,
    packageTier,
    phaseTemplate,
  };
}

async function determineProjectType(
  normalized: NormalizedSubmission
): Promise<ResolvedContext['projectType']> {
  // Analyze text answers for project type keywords
  const textAnswers = normalized.answers
    .filter((a) => typeof a.value === 'string')
    .map((a) => (a.value as string).toLowerCase());

  const combinedText = textAnswers.join(' ');

  for (const [type, config] of Object.entries(REPO_DEFAULTS.projectTypes)) {
    if (type === 'custom') continue; // Skip default fallback

    const hasKeyword = config.keywords.some((keyword) =>
      combinedText.includes(keyword.toLowerCase())
    );

    if (hasKeyword) {
      return type as ResolvedContext['projectType'];
    }
  }

  return 'custom'; // Default fallback
}

async function determinePackageTier(
  normalized: NormalizedSubmission
): Promise<ResolvedContext['packageTier']> {
  // Simple heuristic: count mentioned features/requirements
  const textAnswers = normalized.answers
    .filter((a) => typeof a.value === 'string')
    .map((a) => a.value as string);

  const combinedText = textAnswers.join(' ').toLowerCase();

  // Count feature-like mentions
  const featureIndicators = ['feature', 'functionality', 'capability', 'integration', 'api'];
  let featureCount = 0;

  for (const indicator of featureIndicators) {
    const matches = (combinedText.match(new RegExp(indicator, 'g')) || []).length;
    featureCount += matches;
  }

  // Determine tier based on complexity indicators
  if (featureCount >= 10) return 'custom';
  if (featureCount >= 5) return 'pro';
  return 'basic';
}

async function loadPhaseTemplate(tenantId: string, projectType: ResolvedContext['projectType']) {
  // Try to load tenant-specific overrides first
  try {
    // TODO: Implement tenant config loading after we add the TenantWorkflowConfig table
    // For now, use repo defaults
  } catch (error) {
    console.warn('Failed to load tenant workflow config, using defaults:', error);
  }

  // Fallback to repo defaults
  const template = REPO_DEFAULTS.projectTypes[projectType];
  if (!template) {
    throw new Error(`No phase template found for project type: ${projectType}`);
  }

  return template.phases;
}
