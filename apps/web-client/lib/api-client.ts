// API client for web-client to communicate with web-admin (BFF)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client: {
    id: string;
    name: string | null;
  } | null;
  latestWorkflow: {
    id: string;
    status: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// Workflow snapshot types
export interface WorkflowSnapshot {
  id: string;
  workflowId: string;
  project: {
    id: string;
    name: string;
  };
  workflow: {
    name: string;
    description: string | null;
  };
  phases: Array<{
    id: string;
    name: string;
    intent: string;
    description: string | null;
    order: number;
    tasks: Array<{
      id: string;
      title: string;
      description: string | null;
      order: number;
      priority: string;
      estimatedDurationDays: number | null;
      isMilestone: boolean;
    }>;
  }>;
  progress: {
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    perPhase: Record<string, any>;
  } | null;
  timeline: any;
  createdAt: string;
}

// Generic API request function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        error: errorData.error || `HTTP ${response.status}`,
        message: errorData.message || 'Request failed',
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      error: 'NETWORK_ERROR',
      message: 'Network request failed',
    };
  }
}

// API client methods
export const apiClient = {
  // Projects
  projects: {
    getAll: () => apiRequest<Project[]>('/api/client/projects'),
  },

  // Workflow snapshots
  workflowSnapshots: {
    getAll: (projectId?: string) => {
      const params = projectId ? `?projectId=${projectId}` : '';
      return apiRequest<WorkflowSnapshot[]>(`/api/client/workflow-snapshots${params}`);
    },
  },
};
