import Link from 'next/link';
import type { ReactNode } from 'react';

interface ProjectStatusCardProps {
  title: string;
  status?: string;
  metrics?: { label: string; value: string | number }[];
  icon?: ReactNode;
  actionLabel: string;
  actionHref: string;
  className?: string;
}

export function ProjectStatusCard({
  title,
  status,
  metrics = [],
  icon,
  actionLabel,
  actionHref,
  className = '',
}: ProjectStatusCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'SUBMITTED':
      case 'LOCKED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {status && (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
          >
            {status.replace('_', ' ')}
          </span>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="space-y-2 mb-6">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{metric.label}:</span>
              <span className="text-sm font-medium text-gray-900">{metric.value}</span>
            </div>
          ))}
        </div>
      )}

      <Link
        href={actionHref as any}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors text-center block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
