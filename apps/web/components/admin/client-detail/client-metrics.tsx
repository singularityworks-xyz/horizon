import { FolderKanban, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ClientMetricsProps {
  totalProjects: number;
  inProgress: number;
  completed: number;
  onHold: number;
}

export function ClientMetrics({
  totalProjects,
  inProgress,
  completed,
  onHold,
}: ClientMetricsProps) {
  const metrics = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: FolderKanban,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'In Progress',
      value: inProgress,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'On Hold',
      value: onHold,
      icon: AlertCircle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl ${metric.bgColor} flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{metric.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{metric.label}</p>
          </div>
        );
      })}
    </div>
  );
}
