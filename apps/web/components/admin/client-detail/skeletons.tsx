export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-primary/10 rounded-lg ${className}`} />;
}

export function BrandedSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      <span className="text-xs font-medium text-primary/60 animate-pulse">Loading...</span>
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="relative">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-5 h-32 relative overflow-hidden group"
          >
            <Skeleton className="w-10 h-10 rounded-xl mb-3" />
            <Skeleton className="w-12 h-8 mb-2" />
            <Skeleton className="w-24 h-4" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <BrandedSpinner className="opacity-40" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden relative">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center">
        <Skeleton className="w-32 h-6" />
        <Skeleton className="w-20 h-4" />
      </div>
      <div className="p-6 space-y-4 relative">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-full h-12" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <BrandedSpinner className="opacity-40" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
    </div>
  );
}
