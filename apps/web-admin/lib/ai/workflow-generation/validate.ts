// Step 4: Validate generated workflow
// Ensures the AI-generated workflow meets schema and business requirements

import { validateWorkflowStructure, CreateWorkflowSchema } from '@/lib/workflow/validation';
import { computeWorkflowTimeline } from '@/lib/workflow/compute';
import type { GeneratedWorkflowDraft } from './index';

export async function validateWorkflow(draft: GeneratedWorkflowDraft): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Step 1: Validate against CreateWorkflowSchema
    const schemaResult = CreateWorkflowSchema.safeParse({
      projectId: 'dummy-project-id', // Will be set during persistence
      ...draft,
    });

    if (!schemaResult.success) {
      errors.push(...schemaResult.error.errors.map((err) => `Schema error: ${err.message}`));
    }

    // Step 2: Validate workflow structure (phases/tasks/ordering)
    const structureResult = validateWorkflowStructure(
      draft.phases.map((phase, phaseIndex) => ({
        id: `phase-${phaseIndex}`,
        order: phase.order,
        tasks: phase.tasks.map((task, taskIndex) => ({
          id: `task-${phaseIndex}-${taskIndex}`,
          order: task.order,
        })),
      })),
      'DRAFT' // AI-generated workflows start as DRAFT
    );

    if (!structureResult.isValid) {
      errors.push(...structureResult.errors);
    }

    // Step 3: Validate timeline sanity
    const timelineResult = validateWorkflowTimeline(draft);
    if (!timelineResult.isValid) {
      errors.push(...timelineResult.errors);
    }

    // Step 4: Validate business rules
    const businessResult = validateBusinessRules(draft);
    if (!businessResult.isValid) {
      errors.push(...businessResult.errors);
    }
  } catch (error) {
    errors.push(
      `Validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateWorkflowTimeline(draft: GeneratedWorkflowDraft): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    // Convert draft to timeline computation format
    const tasks = draft.phases.flatMap((phase, phaseIndex) =>
      phase.tasks.map((task, taskIndex) => ({
        id: `task-${phaseIndex}-${taskIndex}`,
        estimatedDurationDays: task.estimatedDurationDays || 1,
        dueDate: null,
      }))
    );

    // Build dependencies (simplified: tasks in same phase have no dependencies)
    const dependencies: Array<{ fromTaskId: string; toTaskId: string }> = [];

    // Compute timeline
    const timeline = computeWorkflowTimeline(tasks, dependencies);

    // Validate timeline sanity
    if (timeline.totalDuration > 365) {
      // More than a year
      errors.push(`Workflow duration too long: ${timeline.totalDuration} days`);
    }

    if (timeline.totalDuration < 7) {
      // Less than a week
      errors.push(`Workflow duration too short: ${timeline.totalDuration} days`);
    }

    // Check for unrealistic task durations
    for (const task of tasks) {
      if ((task.estimatedDurationDays || 1) > 90) {
        // More than 3 months
        errors.push(`Task duration too long: ${task.estimatedDurationDays} days`);
      }
    }
  } catch (error) {
    errors.push(
      `Timeline validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return { isValid: errors.length === 0, errors };
}

function validateBusinessRules(draft: GeneratedWorkflowDraft): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Must have reasonable number of phases
  if (draft.phases.length < 1) {
    errors.push('Workflow must have at least 1 phase');
  }

  if (draft.phases.length > 20) {
    errors.push('Workflow has too many phases (>20)');
  }

  // Each phase must have reasonable number of tasks
  for (const phase of draft.phases) {
    if (phase.tasks.length < 1) {
      errors.push(`Phase "${phase.name}" must have at least 1 task`);
    }

    if (phase.tasks.length > 50) {
      errors.push(`Phase "${phase.name}" has too many tasks (>50)`);
    }
  }

  // Total tasks should be reasonable
  const totalTasks = draft.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  if (totalTasks > 200) {
    errors.push(`Workflow has too many total tasks: ${totalTasks}`);
  }

  // Check for duplicate phase/task names (within same level)
  const phaseNames = new Set<string>();
  for (const phase of draft.phases) {
    if (phaseNames.has(phase.name.toLowerCase())) {
      errors.push(`Duplicate phase name: ${phase.name}`);
    }
    phaseNames.add(phase.name.toLowerCase());

    const taskTitles = new Set<string>();
    for (const task of phase.tasks) {
      if (taskTitles.has(task.title.toLowerCase())) {
        errors.push(`Duplicate task title in phase "${phase.name}": ${task.title}`);
      }
      taskTitles.add(task.title.toLowerCase());
    }
  }

  return { isValid: errors.length === 0, errors };
}
