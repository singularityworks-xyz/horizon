import { FolderKanban, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  workflowCount: number;
  phaseCount: number;
  createdAt: Date;
}

interface ProjectsOverviewProps {
  projects: Project[];
}

const statusStyles: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Active', className: 'bg-blue-500/10 text-blue-500' },
  ON_HOLD: { label: 'On Hold', className: 'bg-amber-500/10 text-amber-500' },
  COMPLETED: { label: 'Completed', className: 'bg-green-500/10 text-green-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-500/10 text-red-500' },
};

export function ProjectsOverview({ projects }: ProjectsOverviewProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Projects</h2>
          <span className="text-sm text-muted-foreground">({projects.length})</span>
        </div>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          + New Project
        </button>
      </div>

      {/* Table */}
      {projects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Project
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Progress
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Phases
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => {
                const status = statusStyles[project.status] || statusStyles.DRAFT;
                return (
                  <tr key={project.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{project.name}</p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(project.progress)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {project.phaseCount > 0 ? `${project.phaseCount} phases` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/admin/dashboard/projects/${project.id}` as any}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="View Project"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <FolderKanban className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground text-center">
            Create a project to get started with this client.
          </p>
        </div>
      )}
    </div>
  );
}
