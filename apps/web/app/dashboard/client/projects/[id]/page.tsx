'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/client/ProgressBar';
import { ProjectStatusCard } from '@/components/client/ProjectStatusCard';
import { getProjectById, type ProjectDetail } from '@/lib/api/client';

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [projectData, setProjectData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId) return;

      try {
        const data = await getProjectById(projectId);
        setProjectData(data);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ON_HOLD':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="text-yellow-800">Project not found</div>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const { project, questionnaire, assets, workflowSnapshot } = projectData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900">{project.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}
        >
          {project.status.replace('_', ' ')}
        </span>
      </div>

      {/* Project Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900">{project.description}</p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Created</h3>
            <p className="mt-1 text-sm text-gray-900">{formatDate(project.createdAt)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
            <p className="mt-1 text-sm text-gray-900">{formatDate(project.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Questionnaire Card */}
        <ProjectStatusCard
          title="Questionnaire"
          status={questionnaire?.status}
          metrics={
            questionnaire
              ? [
                  {
                    label: 'Completion',
                    value: `${questionnaire.completionPercent}%`,
                  },
                  ...(questionnaire.submittedAt
                    ? [
                        {
                          label: 'Submitted',
                          value: formatDate(questionnaire.submittedAt),
                        },
                      ]
                    : []),
                ]
              : []
          }
          icon={
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          actionLabel="View Questionnaire"
          actionHref={`/dashboard/projects/${projectId}/questionnaire`}
        />

        {/* Assets Card */}
        <ProjectStatusCard
          title="Assets"
          metrics={[
            { label: 'Total Files', value: assets.totalCount },
            ...(assets.recent.length > 0
              ? [{ label: 'Recent Uploads', value: assets.recent.length }]
              : []),
          ]}
          icon={
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2m4 0H8l.5 16h7L16 4z"
              />
            </svg>
          }
          actionLabel="View Assets"
          actionHref={`/dashboard/projects/${projectId}/assets`}
        />

        {/* Workflow Card */}
        <ProjectStatusCard
          title="Workflow"
          status={workflowSnapshot ? 'IN_PROGRESS' : 'NOT_STARTED'}
          metrics={
            workflowSnapshot
              ? [
                  {
                    label: 'Progress',
                    value: `${workflowSnapshot.percentComplete}%`,
                  },
                  {
                    label: 'Completed Tasks',
                    value: `${workflowSnapshot.completedTasks}/${workflowSnapshot.totalTasks}`,
                  },
                  ...(workflowSnapshot.phaseBreakdown
                    ? [
                        {
                          label: 'Active Phases',
                          value: workflowSnapshot.phaseBreakdown.length,
                        },
                      ]
                    : []),
                ]
              : [{ label: 'Status', value: 'Not Started' }]
          }
          icon={
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
          actionLabel="View Progress"
          actionHref={`/dashboard/projects/${projectId}/workflow`}
        />
      </div>

      {/* Workflow Progress Details */}
      {workflowSnapshot && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Progress</h2>

          <div className="mb-6">
            <ProgressBar percentage={workflowSnapshot.percentComplete} label="Overall Progress" />
          </div>

          {workflowSnapshot.phaseBreakdown && workflowSnapshot.phaseBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Phase Breakdown</h3>
              <div className="space-y-4">
                {workflowSnapshot.phaseBreakdown.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{phase.phaseName}</h4>
                      <p className="text-sm text-gray-600">
                        {phase.completed}/{phase.total} tasks completed
                      </p>
                    </div>
                    <div className="ml-4 w-32">
                      <ProgressBar
                        percentage={
                          phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Assets */}
      {assets.recent.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Assets</h2>
          <div className="space-y-3">
            {assets.recent.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                    <p className="text-xs text-gray-500">
                      Type: {asset.type} • Uploaded {formatDate(asset.uploadedAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
