export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/[0.06] rounded-lg ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-1 w-full" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-12">
      {/* Welcome skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Programs skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-7 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-4">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CourseGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(12)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
