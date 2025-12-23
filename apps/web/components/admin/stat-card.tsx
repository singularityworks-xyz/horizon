import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div
          className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ${iconColor}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-4xl font-bold text-foreground">{value}</p>
    </div>
  );
}
