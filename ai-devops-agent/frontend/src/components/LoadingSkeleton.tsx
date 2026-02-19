interface LoadingSkeletonProps {
  lines?: number;
}

export function LoadingSkeleton({ lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse rounded-xl2 border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 h-4 w-1/3 rounded bg-gray-700" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="h-3 rounded bg-gray-700/70" />
        ))}
      </div>
    </div>
  );
}
