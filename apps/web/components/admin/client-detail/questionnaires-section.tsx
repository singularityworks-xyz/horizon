import { ClipboardList, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Submission {
  id: string;
  templateName: string;
  projectName: string | null;
  status: string;
  submittedAt: Date | null;
  createdAt: Date;
}

interface QuestionnairesSectionProps {
  submissions: Submission[];
}

const statusStyles: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  SUBMITTED: { label: 'Submitted', className: 'bg-green-500/10 text-green-500' },
  LOCKED: { label: 'Locked', className: 'bg-blue-500/10 text-blue-500' },
};

export function QuestionnairesSection({ submissions }: QuestionnairesSectionProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Questionnaires</h2>
          <span className="text-sm text-muted-foreground">({submissions.length})</span>
        </div>
      </div>

      {/* Table */}
      {submissions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Template
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Project
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Date
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((submission) => {
                const status = statusStyles[submission.status] || statusStyles.DRAFT;
                return (
                  <tr key={submission.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{submission.templateName}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {submission.projectName || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {submission.submittedAt
                        ? formatDate(submission.submittedAt)
                        : formatDate(submission.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/admin/questionnaire/${submission.id}` as any}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="View Answers"
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
            <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No questionnaires</h3>
          <p className="text-sm text-muted-foreground text-center">
            This client hasn&apos;t submitted any questionnaires yet.
          </p>
        </div>
      )}
    </div>
  );
}
