import type { Task, Phase, TaskDependency } from '@horizon/db';

// Types for computed results
export interface TaskTimeline {
  taskId: string;
  earliestStartDay: number; // Days from workflow start
  earliestEndDay: number; // Days from workflow start
  duration: number; // In days
  isOnCriticalPath: boolean;
}

export interface WorkflowTimeline {
  totalDuration: number; // Total days from start to finish
  criticalPathDuration: number; // Duration of the longest path
  criticalPath: string[]; // Task IDs on the critical path
  taskTimelines: TaskTimeline[];
}

export interface PhaseTimeline {
  phaseId: string;
  duration: number; // Sum of task durations in this phase
  startDay: number; // Earliest start day across tasks
  endDay: number; // Latest end day across tasks
}

/**
 * Computes the timeline for a workflow including critical path analysis.
 * Returns timeline information for the entire workflow and individual tasks.
 */
export function computeWorkflowTimeline(
  tasks: Array<{
    id: string;
    estimatedDurationDays: number | null;
    dueDate?: Date | null;
  }>,
  dependencies: Array<{
    fromTaskId: string;
    toTaskId: string;
  }>,
  workflowStartDate?: Date
): WorkflowTimeline {
  // Build adjacency list (task -> dependents) and reverse adjacency (task -> prerequisites)
  const graph = new Map<string, string[]>();
  const reverseGraph = new Map<string, string[]>();
  const taskMap = new Map<string, (typeof tasks)[0]>();

  // Initialize structures
  for (const task of tasks) {
    graph.set(task.id, []);
    reverseGraph.set(task.id, []);
    taskMap.set(task.id, task);
  }

  // Build dependency relationships
  for (const dep of dependencies) {
    graph.get(dep.fromTaskId)!.push(dep.toTaskId);
    reverseGraph.get(dep.toTaskId)!.push(dep.fromTaskId);
  }

  // Compute earliest start times (forward pass)
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();

  // Tasks with no prerequisites start at day 0
  const queue: string[] = [];
  for (const task of tasks) {
    if (reverseGraph.get(task.id)!.length === 0) {
      earliestStart.set(task.id, 0);
      const duration = task.estimatedDurationDays || 1;
      earliestFinish.set(task.id, duration);
      queue.push(task.id);
    }
  }

  // Process tasks in topological order
  const processed = new Set<string>();
  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;
    processed.add(currentTaskId);

    const currentFinish = earliestFinish.get(currentTaskId)!;

    // Update all dependent tasks
    for (const dependentId of graph.get(currentTaskId)!) {
      const dependentTask = taskMap.get(dependentId)!;
      const dependentDuration = dependentTask.estimatedDurationDays || 1;

      // Earliest start is the maximum of all prerequisite finish times
      const currentEarliestStart = earliestStart.get(dependentId) || 0;
      const newEarliestStart = Math.max(currentEarliestStart, currentFinish);

      earliestStart.set(dependentId, newEarliestStart);
      earliestFinish.set(dependentId, newEarliestStart + dependentDuration);

      // Add to queue if all prerequisites are processed
      const prerequisites = reverseGraph.get(dependentId)!;
      if (prerequisites.every((prereq) => processed.has(prereq))) {
        queue.push(dependentId);
      }
    }
  }

  // Compute latest finish times (backward pass)
  const latestFinish = new Map<string, number>();
  const latestStart = new Map<string, number>();

  // Find the overall finish time (latest finish among all tasks)
  let maxFinishTime = 0;
  for (const task of tasks) {
    maxFinishTime = Math.max(maxFinishTime, earliestFinish.get(task.id) || 0);
  }

  // Tasks with no dependents finish at the overall finish time
  const reverseQueue: string[] = [];
  for (const task of tasks) {
    if (graph.get(task.id)!.length === 0) {
      latestFinish.set(task.id, maxFinishTime);
      const duration = task.estimatedDurationDays || 1;
      latestStart.set(task.id, maxFinishTime - duration);
      reverseQueue.push(task.id);
    }
  }

  // Process tasks in reverse topological order
  const reverseProcessed = new Set<string>();
  while (reverseQueue.length > 0) {
    const currentTaskId = reverseQueue.shift()!;
    reverseProcessed.add(currentTaskId);

    const currentStart = latestStart.get(currentTaskId)!;

    // Update all prerequisite tasks
    for (const prerequisiteId of reverseGraph.get(currentTaskId)!) {
      const prerequisiteTask = taskMap.get(prerequisiteId)!;
      const prerequisiteDuration = prerequisiteTask.estimatedDurationDays || 1;

      // Latest finish is the minimum of all dependent start times
      const currentLatestFinish = latestFinish.get(prerequisiteId) || Infinity;
      const newLatestFinish = Math.min(currentLatestFinish, currentStart);

      latestFinish.set(prerequisiteId, newLatestFinish);
      latestStart.set(prerequisiteId, newLatestFinish - prerequisiteDuration);

      // Add to queue if all dependents are processed
      const dependents = graph.get(prerequisiteId)!;
      if (dependents.every((dep) => reverseProcessed.has(dep))) {
        reverseQueue.push(prerequisiteId);
      }
    }
  }

  // Identify critical path (tasks where earliest == latest)
  const criticalPath: string[] = [];
  for (const task of tasks) {
    const earliest = earliestStart.get(task.id) || 0;
    const latest = latestStart.get(task.id) || 0;
    if (Math.abs(earliest - latest) < 0.1) {
      // Account for floating point precision
      criticalPath.push(task.id);
    }
  }

  // Build timeline results
  const taskTimelines: TaskTimeline[] = tasks.map((task) => {
    const startDay = earliestStart.get(task.id) || 0;
    const duration = task.estimatedDurationDays || 1;
    const endDay = startDay + duration;

    return {
      taskId: task.id,
      earliestStartDay: startDay,
      earliestEndDay: endDay,
      duration,
      isOnCriticalPath: criticalPath.includes(task.id),
    };
  });

  return {
    totalDuration: maxFinishTime,
    criticalPathDuration: maxFinishTime, // Critical path is the longest path
    criticalPath,
    taskTimelines,
  };
}

/**
 * Computes timeline information for phases based on their tasks.
 */
export function computePhaseTimelines(
  phases: Array<{
    id: string;
    tasks: Array<{
      id: string;
      estimatedDurationDays: number | null;
    }>;
  }>,
  taskTimelines: TaskTimeline[]
): PhaseTimeline[] {
  const taskTimelineMap = new Map(taskTimelines.map((t) => [t.taskId, t]));

  return phases.map((phase) => {
    const phaseTaskTimelines = phase.tasks
      .map((task) => taskTimelineMap.get(task.id))
      .filter(Boolean) as TaskTimeline[];

    if (phaseTaskTimelines.length === 0) {
      return {
        phaseId: phase.id,
        duration: 0,
        startDay: 0,
        endDay: 0,
      };
    }

    const startDay = Math.min(...phaseTaskTimelines.map((t) => t.earliestStartDay));
    const endDay = Math.max(...phaseTaskTimelines.map((t) => t.earliestEndDay));
    const duration = endDay - startDay;

    return {
      phaseId: phase.id,
      duration,
      startDay,
      endDay,
    };
  });
}

/**
 * Computes deadline heuristics for tasks and phases.
 * Uses explicit due dates when available, otherwise computes from workflow start.
 */
export function computeDeadlines(
  tasks: Array<{
    id: string;
    dueDate?: Date | null;
    estimatedDurationDays: number | null;
  }>,
  phases: Array<{
    id: string;
    startDate?: Date | null;
  }>,
  workflowStartDate?: Date,
  taskTimelines: TaskTimeline[]
): {
  taskDeadlines: Map<string, Date>;
  phaseDeadlines: Map<string, Date>;
} {
  const taskDeadlineMap = new Map<string, Date>();
  const phaseDeadlineMap = new Map<string, Date>();

  const taskTimelineMap = new Map(taskTimelines.map((t) => [t.taskId, t]));

  // Compute task deadlines
  for (const task of tasks) {
    if (task.dueDate) {
      // Use explicit due date
      taskDeadlineMap.set(task.id, task.dueDate);
    } else if (workflowStartDate) {
      // Compute from workflow start + timeline
      const timeline = taskTimelineMap.get(task.id);
      if (timeline) {
        const deadline = new Date(workflowStartDate);
        deadline.setDate(deadline.getDate() + timeline.earliestEndDay);
        taskDeadlineMap.set(task.id, deadline);
      }
    }
  }

  // Compute phase deadlines (latest task deadline in phase)
  const phaseTaskMap = new Map<string, typeof tasks>();

  // Group tasks by phase (assuming tasks have phaseId)
  // This would be passed in from the caller

  // For now, compute based on phase start date + computed duration
  for (const phase of phases) {
    if (phase.startDate) {
      // Find tasks in this phase and their latest deadline
      // This logic would need to be enhanced based on how phases relate to tasks
      const phaseDeadline = new Date(phase.startDate);
      // Add some default duration - this should be computed from actual phase duration
      phaseDeadlineMap.set(phase.id, phaseDeadline);
    }
  }

  return {
    taskDeadlines: taskDeadlineMap,
    phaseDeadlines: phaseDeadlineMap,
  };
}

/**
 * Calculates the total duration of a workflow based on dependencies and estimates.
 */
export function calculateWorkflowDuration(
  tasks: Array<{
    id: string;
    estimatedDurationDays: number | null;
  }>,
  dependencies: Array<{
    fromTaskId: string;
    toTaskId: string;
  }>
): number {
  const timeline = computeWorkflowTimeline(tasks, dependencies);
  return timeline.totalDuration;
}

/**
 * Calculates the duration of a single phase based on its tasks.
 */
export function calculatePhaseDuration(
  phaseTasks: Array<{
    id: string;
    estimatedDurationDays: number | null;
  }>,
  allDependencies: Array<{
    fromTaskId: string;
    toTaskId: string;
  }>
): number {
  const timeline = computeWorkflowTimeline(phaseTasks, allDependencies);
  return timeline.totalDuration;
}
