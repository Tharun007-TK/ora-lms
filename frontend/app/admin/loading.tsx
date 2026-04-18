import { Skeleton } from '@/components/ora';

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-[var(--surface-sunken)] px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="ml-auto h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
