'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/client/ProgressBar';
import { getClientProjects } from '@/lib/api/client';

export function ClientOverview() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await getClientProjects();
        setProjects(response.projects || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'DRAFT':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ON_HOLD':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Projects</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-background border border-border rounded-md text-sm font-medium hover:bg-secondary transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
              Dashboard
            </h1>
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Client
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-sm tracking-tight opacity-70">
            Welcome back. Track and manage your active project workflows.
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer">
          New Project request
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Your workspace is empty. Once your agency sets up a project, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-200 shadow-sm hover:shadow-md group flex flex-col h-full"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(project.status)}`}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Questionnaire Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Questionnaire</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                        project.questionnaireStatus === 'SUBMITTED'
                          ? 'bg-green-50 text-green-700'
                          : project.questionnaireStatus === 'LOCKED'
                            ? 'bg-blue-50 text-blue-700'
                            : project.questionnaireStatus === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {project.questionnaireStatus === 'SUBMITTED' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      )}
                      {project.questionnaireStatus === 'DRAFT' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      )}
                      {project.questionnaireStatus || 'Not Started'}
                    </span>
                  </div>

                  {/* Asset Count */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Assets</span>
                    <span className="font-medium text-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
                      {project.assetCount} {project.assetCount === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  {/* Workflow Progress */}
                  {project.workflowProgress && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">
                          {project.workflowProgress.percentComplete}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500 ease-out"
                          style={{ width: `${project.workflowProgress.percentComplete}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border bg-secondary/10 mt-auto">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDate(project.updatedAt)}
                  </div>
                  <Link
                    href={`/dashboard/projects/${project.id}` as any}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                  >
                    View Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
