import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  animationDelay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  subtitle = "Updated in real-time",
  animationDelay = 0,
}: StatCardProps) {
  return (
    <div
      className="group relative animate-slide-up overflow-hidden rounded-2xl border border-border bg-transparent p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-primary/10 hover:shadow-xl"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Animated background gradient */}
      <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/5 transition-all duration-500 group-hover:scale-150 group-hover:bg-primary/10" />
      <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-secondary/5 opacity-0 transition-all duration-500 group-hover:scale-125 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
            {title}
          </h3>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/20">
            <Icon
              className={`h-6 w-6 ${iconColor} transition-transform duration-300 group-hover:scale-110`}
            />
          </div>
        </div>
        <p className="font-bold text-4xl text-foreground tracking-tight transition-all duration-300 group-hover:text-primary">
          {value}
        </p>
        <p className="mt-2 text-muted-foreground text-xs">{subtitle}</p>
      </div>
    </div>
  );
}
