export default function Loading() {
  return (
    <div className="space-y-4" aria-busy role="status">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
    </div>
  );
}
