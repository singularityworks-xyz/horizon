import { describe, expect, it } from 'vitest';
import {
  calculateWorkflowDuration,
  computePhaseTimelines,
  computeWorkflowTimeline,
} from '../compute';

describe('Workflow Compute Utilities', () => {
  describe('computeWorkflowTimeline', () => {
    it('should compute timeline for tasks with no dependencies', () => {
      const tasks = [
        { id: 'task1', estimatedDurationDays: 3 },
        { id: 'task2', estimatedDurationDays: 5 },
        { id: 'task3', estimatedDurationDays: 2 },
      ];
      const dependencies: Array<{ fromTaskId: string; toTaskId: string }> = [];

      const result = computeWorkflowTimeline(tasks, dependencies);

      expect(result.totalDuration).toBe(5); // Max of 3, 5, 2
      expect(result.criticalPathDuration).toBe(5);
      expect(result.criticalPath).toContain('task2'); // Task with longest duration
      expect(result.taskTimelines).toHaveLength(3);

      const task2Timeline = result.taskTimelines.find((t) => t.taskId === 'task2');
      expect(task2Timeline?.earliestStartDay).toBe(0);
      expect(task2Timeline?.earliestEndDay).toBe(5);
      expect(task2Timeline?.isOnCriticalPath).toBe(true);
    });

    it('should compute timeline with dependencies', () => {
      const tasks = [
        { id: 'task1', estimatedDurationDays: 3 },
        { id: 'task2', estimatedDurationDays: 2 },
        { id: 'task3', estimatedDurationDays: 4 },
        { id: 'task4', estimatedDurationDays: 1 },
      ];
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task3' }, // task3 depends on task1
        { fromTaskId: 'task2', toTaskId: 'task4' }, // task4 depends on task2
      ];

      const result = computeWorkflowTimeline(tasks, dependencies);

      // Critical path: task1 -> task3 = 3 + 4 = 7 days
      // Parallel path: task2 -> task4 = 2 + 1 = 3 days
      expect(result.totalDuration).toBe(7);
      expect(result.criticalPath).toEqual(['task1', 'task3']);

      const task3Timeline = result.taskTimelines.find((t) => t.taskId === 'task3');
      expect(task3Timeline?.earliestStartDay).toBe(3); // After task1 finishes
      expect(task3Timeline?.earliestEndDay).toBe(7);
      expect(task3Timeline?.isOnCriticalPath).toBe(true);

      const task4Timeline = result.taskTimelines.find((t) => t.taskId === 'task4');
      expect(task4Timeline?.earliestStartDay).toBe(2); // After task2 finishes
      expect(task4Timeline?.earliestEndDay).toBe(3);
      expect(task4Timeline?.isOnCriticalPath).toBe(false);
    });

    it('should handle complex dependency chains', () => {
      const tasks = [
        { id: 'task1', estimatedDurationDays: 2 },
        { id: 'task2', estimatedDurationDays: 3 },
        { id: 'task3', estimatedDurationDays: 1 },
        { id: 'task4', estimatedDurationDays: 4 },
        { id: 'task5', estimatedDurationDays: 2 },
      ];
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task3' },
        { fromTaskId: 'task2', toTaskId: 'task3' },
        { fromTaskId: 'task3', toTaskId: 'task4' },
        { fromTaskId: 'task3', toTaskId: 'task5' },
      ];

      const result = computeWorkflowTimeline(tasks, dependencies);

      // task3 starts after max(task1.finish, task2.finish) = max(2, 3) = 3
      // task4 starts after task3.finish = 3 + 1 = 4, ends at 4 + 4 = 8
      // task5 starts after task3.finish = 4, ends at 4 + 2 = 6
      // Total duration = max(8, 6) = 8
      expect(result.totalDuration).toBe(8);
      expect(result.criticalPath).toEqual(['task2', 'task3', 'task4']);

      const task3Timeline = result.taskTimelines.find((t) => t.taskId === 'task3');
      expect(task3Timeline?.earliestStartDay).toBe(3); // Max of task1 and task2 finish times
    });

    it('should handle null estimated durations (defaults to 1)', () => {
      const tasks = [
        { id: 'task1', estimatedDurationDays: null },
        { id: 'task2', estimatedDurationDays: 3 },
      ];
      const dependencies: Array<{ fromTaskId: string; toTaskId: string }> = [];

      const result = computeWorkflowTimeline(tasks, dependencies);

      expect(result.totalDuration).toBe(3); // Max of 1 and 3
      expect(result.taskTimelines.find((t) => t.taskId === 'task1')?.duration).toBe(1);
      expect(result.taskTimelines.find((t) => t.taskId === 'task2')?.duration).toBe(3);
    });

    it('should handle empty task list', () => {
      const tasks: Array<{ id: string; estimatedDurationDays: number | null }> = [];
      const dependencies: Array<{ fromTaskId: string; toTaskId: string }> = [];

      const result = computeWorkflowTimeline(tasks, dependencies);

      expect(result.totalDuration).toBe(0);
      expect(result.criticalPath).toEqual([]);
      expect(result.taskTimelines).toEqual([]);
    });
  });

  describe('calculateWorkflowDuration', () => {
    it('should calculate duration for simple tasks', () => {
      const tasks = [
        { id: 'task1', estimatedDurationDays: 3 },
        { id: 'task2', estimatedDurationDays: 5 },
      ];
      const dependencies: Array<{ fromTaskId: string; toTaskId: string }> = [];

      const duration = calculateWorkflowDuration(tasks, dependencies);
      expect(duration).toBe(5); // Max duration
    });

    it('should calculate duration with dependencies', () => {
      const tasks = [
        { id: 'task1', estimatedDurationDays: 2 },
        { id: 'task2', estimatedDurationDays: 3 },
        { id: 'task3', estimatedDurationDays: 1 },
      ];
      const dependencies = [
        { fromTaskId: 'task1', toTaskId: 'task3' },
        { fromTaskId: 'task2', toTaskId: 'task3' },
      ];

      const duration = calculateWorkflowDuration(tasks, dependencies);
      expect(duration).toBe(4); // task3 starts at day 3, ends at day 4
    });
  });

  describe('computePhaseTimelines', () => {
    it('should compute phase timelines from task timelines', () => {
      const phases = [
        {
          id: 'phase1',
          tasks: [
            { id: 'task1', estimatedDurationDays: 2 },
            { id: 'task2', estimatedDurationDays: 3 },
          ],
        },
        {
          id: 'phase2',
          tasks: [{ id: 'task3', estimatedDurationDays: 1 }],
        },
      ];

      const taskTimelines = [
        {
          taskId: 'task1',
          earliestStartDay: 0,
          earliestEndDay: 2,
          duration: 2,
          isOnCriticalPath: false,
        },
        {
          taskId: 'task2',
          earliestStartDay: 0,
          earliestEndDay: 3,
          duration: 3,
          isOnCriticalPath: true,
        },
        {
          taskId: 'task3',
          earliestStartDay: 3,
          earliestEndDay: 4,
          duration: 1,
          isOnCriticalPath: false,
        },
      ];

      const result = computePhaseTimelines(phases, taskTimelines);

      expect(result).toHaveLength(2);

      const phase1 = result.find((p) => p.phaseId === 'phase1');
      expect(phase1?.startDay).toBe(0); // Earliest task start
      expect(phase1?.endDay).toBe(3); // Latest task end
      expect(phase1?.duration).toBe(3); // end - start

      const phase2 = result.find((p) => p.phaseId === 'phase2');
      expect(phase2?.startDay).toBe(3);
      expect(phase2?.endDay).toBe(4);
      expect(phase2?.duration).toBe(1);
    });

    it('should handle phases with no tasks', () => {
      const phases = [
        {
          id: 'empty-phase',
          tasks: [],
        },
      ];

      const taskTimelines: Array<{
        taskId: string;
        earliestStartDay: number;
        earliestEndDay: number;
        duration: number;
        isOnCriticalPath: boolean;
      }> = [];

      const result = computePhaseTimelines(phases, taskTimelines);

      expect(result[0].startDay).toBe(0);
      expect(result[0].endDay).toBe(0);
      expect(result[0].duration).toBe(0);
    });
  });
});
