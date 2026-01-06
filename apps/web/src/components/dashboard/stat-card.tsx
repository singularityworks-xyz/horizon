import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  subtitle = "Updated in real-time",
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
            {title}
          </h3>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        <p className="font-bold text-4xl tracking-tight">{value}</p>
        <p className="mt-2 text-muted-foreground text-xs">{subtitle}</p>
      </div>
    </div>
  );
}
