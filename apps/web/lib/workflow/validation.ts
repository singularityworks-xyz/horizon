import { z } from 'zod';

// Base enums from Prisma
export const PhaseIntentEnum = z.enum([
  'DISCOVERY',
  'DESIGN',
  'BUILD',
  'TEST',
  'DEPLOY',
  'MAINTENANCE',
  'CUSTOM',
]);

export const WorkflowSourceEnum = z.enum(['MANUAL', 'AI_GENERATED']);

export const WorkflowStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);

export const PhaseStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']);

export const TaskStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'BLOCKED',
  'CANCELLED',
]);

export const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export type PhaseIntent = z.infer<typeof PhaseIntentEnum>;
export type WorkflowSource = z.infer<typeof WorkflowSourceEnum>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;
export type PhaseStatus = z.infer<typeof PhaseStatusEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type Priority = z.infer<typeof PriorityEnum>;

// Workflow schemas
export const CreateWorkflowSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  source: WorkflowSourceEnum.default('MANUAL'),
  status: WorkflowStatusEnum.default('DRAFT'),
  // Optional initial phases and tasks
  phases: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        intent: PhaseIntentEnum.default('CUSTOM'),
        description: z.string().optional(),
        order: z.number().int().min(0),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        source: WorkflowSourceEnum.default('MANUAL'),
        tasks: z
          .array(
            z.object({
              title: z.string().min(1).max(255),
              description: z.string().optional(),
              order: z.number().int().min(0),
              priority: PriorityEnum.default('MEDIUM'),
              assigneeId: z.string().cuid().optional(),
              dueDate: z.string().datetime().optional(),
              estimatedDurationDays: z.number().int().min(1).optional(),
              isMilestone: z.boolean().default(false),
              source: WorkflowSourceEnum.default('MANUAL'),
            })
          )
          .min(1), // Each phase must have at least 1 task
      })
    )
    .optional(),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: WorkflowStatusEnum.optional(),
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;

// Phase schemas
export const CreatePhaseSchema = z.object({
  name: z.string().min(1).max(255),
  intent: PhaseIntentEnum.default('CUSTOM'),
  description: z.string().optional(),
  order: z.number().int().min(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  source: WorkflowSourceEnum.default('MANUAL'),
});

export const UpdatePhaseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  intent: PhaseIntentEnum.optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  status: PhaseStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreatePhaseInput = z.infer<typeof CreatePhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof UpdatePhaseSchema>;

// Task schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  order: z.number().int().min(0),
  priority: PriorityEnum.default('MEDIUM'),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedDurationDays: z.number().int().min(1).optional(),
  isMilestone: z.boolean().default(false),
  source: WorkflowSourceEnum.default('MANUAL'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedDurationDays: z.number().int().min(1).optional(),
  isMilestone: z.boolean().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// Dependency schemas
export const CreateDependencySchema = z.object({
  fromTaskId: z.string().cuid(), // Prerequisite task
  toTaskId: z.string().cuid(), // Dependent task
});

export const DependencySchema = z.object({
  id: z.string().cuid(),
  fromTaskId: z.string().cuid(),
  toTaskId: z.string().cuid(),
});

export type CreateDependencyInput = z.infer<typeof CreateDependencySchema>;
export type Dependency = z.infer<typeof DependencySchema>;

// Runtime validation functions

/**
 * Validates that a workflow has proper structure:
 * - At least 1 phase
 * - Each phase has at least 1 task (unless draft)
 * - Order uniqueness within workflow and phases
 */
export function validateWorkflowStructure(
  phases: Array<{
    id: string;
    order: number;
    tasks: Array<{ id: string; order: number }>;
  }>,
  workflowStatus: WorkflowStatus
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have at least 1 phase
  if (phases.length === 0) {
    errors.push('Workflow must have at least one phase');
  }

  // Check phase order uniqueness
  const phaseOrders = new Set<number>();
  for (const phase of phases) {
    if (phaseOrders.has(phase.order)) {
      errors.push(`Duplicate phase order: ${phase.order}`);
    }
    phaseOrders.add(phase.order);
  }

  // For ACTIVE workflows, each phase must have at least 1 task
  if (workflowStatus === 'ACTIVE') {
    for (const phase of phases) {
      if (phase.tasks.length === 0) {
        errors.push(`Phase "${phase.id}" must have at least one task for ACTIVE workflows`);
      }
    }
  }

  // Check task order uniqueness within each phase
  for (const phase of phases) {
    const taskOrders = new Set<number>();
    for (const task of phase.tasks) {
      if (taskOrders.has(task.order)) {
        errors.push(`Duplicate task order ${task.order} in phase "${phase.id}"`);
      }
      taskOrders.add(task.order);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates that task dependencies form a valid DAG (Directed Acyclic Graph):
 * - No cycles
 * - No self-dependencies
 * - All tasks belong to the same workflow
 */
export function validateTaskDependencies(
  dependencies: Dependency[],
  allTaskIds: Set<string>
): { isValid: boolean; errors: string[]; topologicalOrder?: string[] } {
  const errors: string[] = [];

  // Build adjacency list and indegree map
  const graph = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  // Initialize all tasks
  for (const taskId of allTaskIds) {
    graph.set(taskId, []);
    indegree.set(taskId, 0);
  }

  // Build graph from dependencies
  for (const dep of dependencies) {
    // Validate that both tasks exist in the workflow
    if (!allTaskIds.has(dep.fromTaskId)) {
      errors.push(`Prerequisite task ${dep.fromTaskId} does not exist in workflow`);
      continue;
    }
    if (!allTaskIds.has(dep.toTaskId)) {
      errors.push(`Dependent task ${dep.toTaskId} does not exist in workflow`);
      continue;
    }

    // No self-dependency
    if (dep.fromTaskId === dep.toTaskId) {
      errors.push(`Task ${dep.fromTaskId} cannot depend on itself`);
      continue;
    }

    // Add edge to graph
    graph.get(dep.fromTaskId)!.push(dep.toTaskId);
    indegree.set(dep.toTaskId, indegree.get(dep.toTaskId)! + 1);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Perform topological sort to detect cycles
  const queue: string[] = [];
  const topologicalOrder: string[] = [];

  // Start with nodes that have no incoming edges
  for (const [taskId, degree] of indegree) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    topologicalOrder.push(current);

    // Reduce indegree of neighbors
    for (const neighbor of graph.get(current)!) {
      const newIndegree = indegree.get(neighbor)! - 1;
      indegree.set(neighbor, newIndegree);
      if (newIndegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If topological order doesn't include all tasks, there's a cycle
  if (topologicalOrder.length !== allTaskIds.size) {
    errors.push('Task dependencies contain cycles');
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [], topologicalOrder };
}

/**
 * Validates task status transitions and rules:
 * - COMPLETED tasks must have completedAt set
 * - Status transitions are logical
 */
export function validateTaskStatus(
  status: TaskStatus,
  completedAt?: Date | null
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (status === 'COMPLETED' && !completedAt) {
    errors.push('COMPLETED tasks must have completedAt set');
  }

  if (status !== 'COMPLETED' && completedAt) {
    errors.push('Only COMPLETED tasks can have completedAt set');
  }

  return { isValid: errors.length === 0, errors };
}
