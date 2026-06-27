// Branded loading state for the workflow page.
export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="tt-card tt-scan tt-glow mb-6 flex items-center gap-4 p-5">
        <div className="h-12 w-12 animate-pulse rounded-lg border border-line bg-ink-2" />
        <div className="space-y-2">
          <div className="tt-label animate-pulse text-violet-soft">Papertrail OS</div>
          <div className="tt-display text-lg">Loading signal…</div>
        </div>
      </div>
      <div className="mb-6 flex gap-1 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 w-[88px] shrink-0 animate-pulse rounded-md border border-line bg-ink-2" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-md border border-line bg-ink-2" />
    </main>
  );
}
