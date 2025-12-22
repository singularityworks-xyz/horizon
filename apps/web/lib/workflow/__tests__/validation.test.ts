import { describe, expect, it } from 'vitest';
import {
  CreateDependencySchema,
  CreatePhaseSchema,
  CreateTaskSchema,
  CreateWorkflowSchema,
  validateTaskDependencies,
  validateTaskStatus,
  validateWorkflowStructure,
} from '../validation';

describe('Workflow Validation', () => {
  describe('validateWorkflowStructure', () => {
    it('should validate correct workflow structure', () => {
      const phases = [
        {
          id: 'phase1',
          order: 0,
          tasks: [
            { id: 'task1', order: 0 },
            { id: 'task2', order: 1 },
          ],
        },
        {
          id: 'phase2',
          order: 1,
          tasks: [{ id: 'task3', order: 0 }],
        },
      ];

      const result = validateWorkflowStructure(phases, 'ACTIVE');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject workflow with no phases', () => {
      const phases: Array<{
        id: string;
        order: number;
        tasks: Array<{ id: string; order: number }>;
      }> = [];

      const result = validateWorkflowStructure(phases, 'ACTIVE');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Workflow must have at least one phase');
    });

    it('should reject duplicate phase orders', () => {
      const phases = [
        { id: 'phase1', order: 0, tasks: [{ id: 'task1', order: 0 }] },
        { id: 'phase2', order: 0, tasks: [{ id: 'task2', order: 0 }] }, // Duplicate order
      ];

      const result = validateWorkflowStructure(phases, 'ACTIVE');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate phase order: 0');
    });

    it('should reject ACTIVE workflow with empty phases', () => {
      const phases = [
        { id: 'phase1', order: 0, tasks: [] }, // No tasks
        { id: 'phase2', order: 1, tasks: [{ id: 'task1', order: 0 }] },
      ];

      const result = validateWorkflowStructure(phases, 'ACTIVE');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Phase "phase1" must have at least one task for ACTIVE workflows'
      );
    });

    it('should allow DRAFT workflow with empty phases', () => {
      const phases = [{ id: 'phase1', order: 0, tasks: [] }];

      const result = validateWorkflowStructure(phases, 'DRAFT');
      expect(result.isValid).toBe(true);
    });

    it('should reject duplicate task orders within phase', () => {
      const phases = [
        {
          id: 'phase1',
          order: 0,
          tasks: [
            { id: 'task1', order: 0 },
            { id: 'task2', order: 0 }, // Duplicate order
          ],
        },
      ];

      const result = validateWorkflowStructure(phases, 'ACTIVE');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate task order 0 in phase "phase1"');
    });
  });

  describe('validateTaskDependencies', () => {
    const taskIds = new Set(['task1', 'task2', 'task3', 'task4']);

    it('should validate valid dependency graph', () => {
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task2' },
        { fromTaskId: 'task2', toTaskId: 'task3' },
      ];

      const result = validateTaskDependencies(dependencies, taskIds);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.topologicalOrder).toEqual(['task1', 'task4', 'task2', 'task3']);
    });

    it('should detect cycles', () => {
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task2' },
        { fromTaskId: 'task2', toTaskId: 'task1' }, // Cycle
      ];

      const result = validateTaskDependencies(dependencies, taskIds);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task dependencies contain cycles');
    });

    it('should reject self-dependencies', () => {
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task1' }, // Self-dependency
      ];

      const result = validateTaskDependencies(dependencies, taskIds);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task task1 cannot depend on itself');
    });

    it('should reject dependencies to non-existent tasks', () => {
      const dependencies = [{ fromTaskId: 'task1', toTaskId: 'nonexistent' }];

      const result = validateTaskDependencies(dependencies, taskIds);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dependent task nonexistent does not exist in workflow');
    });

    it('should handle complex valid graphs', () => {
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task3' },
        { fromTaskId: 'task2', toTaskId: 'task3' },
        { fromTaskId: 'task3', toTaskId: 'task4' },
      ];

      const result = validateTaskDependencies(dependencies, taskIds);
      expect(result.isValid).toBe(true);
      expect(result.topologicalOrder).toContain('task1');
      expect(result.topologicalOrder).toContain('task2');
      expect(result.topologicalOrder!.indexOf('task3')).toBeGreaterThan(
        result.topologicalOrder!.indexOf('task1')
      );
      expect(result.topologicalOrder!.indexOf('task3')).toBeGreaterThan(
        result.topologicalOrder!.indexOf('task2')
      );
      expect(result.topologicalOrder!.indexOf('task4')).toBeGreaterThan(
        result.topologicalOrder!.indexOf('task3')
      );
    });

    it('should handle empty dependencies', () => {
      const dependencies: Array<{ fromTaskId: string; toTaskId: string }> = [];

      const result = validateTaskDependencies(dependencies, taskIds);
      expect(result.isValid).toBe(true);
      expect(result.topologicalOrder).toEqual(['task1', 'task2', 'task3', 'task4']);
    });
  });

  describe('validateTaskStatus', () => {
    it('should allow valid status transitions', () => {
      const result = validateTaskStatus('COMPLETED', new Date());
      expect(result.isValid).toBe(true);
    });

    it('should require completedAt for COMPLETED status', () => {
      const result = validateTaskStatus('COMPLETED', null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('COMPLETED tasks must have completedAt set');
    });

    it('should reject completedAt for non-COMPLETED status', () => {
      const result = validateTaskStatus('IN_PROGRESS', new Date());
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only COMPLETED tasks can have completedAt set');
    });

    it('should allow PENDING status without completedAt', () => {
      const result = validateTaskStatus('PENDING', null);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Zod Schemas', () => {
    describe('CreateWorkflowSchema', () => {
      it('should validate correct workflow creation data', () => {
        const data = {
          projectId: 'cjld2cjxh0000qzrmn831i7rn', // Valid CUID
          name: 'Test Workflow',
          description: 'A test workflow',
          source: 'MANUAL' as const,
          status: 'DRAFT' as const,
          phases: [
            {
              name: 'Discovery Phase',
              intent: 'DISCOVERY' as const,
              description: 'Initial discovery',
              order: 0,
              source: 'MANUAL' as const,
              tasks: [
                {
                  title: 'Research requirements',
                  description: 'Gather requirements',
                  order: 0,
                  priority: 'HIGH' as const,
                  estimatedDurationDays: 5,
                  isMilestone: false,
                  source: 'MANUAL' as const,
                },
              ],
            },
          ],
        };

        const result = CreateWorkflowSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow workflow without phases', () => {
        const data = {
          projectId: 'cjld2cjxh0000qzrmn831i7rn', // Valid CUID
          name: 'Simple Workflow',
          source: 'MANUAL' as const,
          status: 'DRAFT' as const,
        };

        const result = CreateWorkflowSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject invalid data', () => {
        const data = {
          projectId: 'invalid-id', // Invalid CUID
          name: '', // Empty name
          source: 'INVALID' as any,
        };

        const result = CreateWorkflowSchema.safeParse(data);
        expect(result.success).toBe(false);
        expect(result.error?.issues).toHaveLength(3); // projectId, name, source
      });
    });

    describe('CreatePhaseSchema', () => {
      it('should validate correct phase creation data', () => {
        const data = {
          name: 'Design Phase',
          intent: 'DESIGN' as const,
          description: 'UI/UX design',
          order: 1,
          source: 'MANUAL' as const,
        };

        const result = CreatePhaseSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should require name', () => {
        const data = {
          intent: 'DESIGN' as const,
          order: 1,
        };

        const result = CreatePhaseSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });

    describe('CreateTaskSchema', () => {
      it('should validate correct task creation data', () => {
        const data = {
          title: 'Create wireframes',
          description: 'Design initial wireframes',
          order: 0,
          priority: 'MEDIUM' as const,
          estimatedDurationDays: 3,
          isMilestone: true,
          source: 'MANUAL' as const,
        };

        const result = CreateTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow optional fields', () => {
        const data = {
          title: 'Simple task',
          order: 0,
        };

        const result = CreateTaskSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('CreateDependencySchema', () => {
      it('should validate dependency creation data', () => {
        const data = {
          fromTaskId: 'cjld2cjxh0000qzrmn831i7rn', // Valid CUID format
          toTaskId: 'cjld2cjxh0001qzrmn831i7rn', // Valid CUID format
        };

        const result = CreateDependencySchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should require valid CUIDs', () => {
        const data = {
          fromTaskId: 'invalid-id',
          toTaskId: 'another-invalid',
        };

        const result = CreateDependencySchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });
});
