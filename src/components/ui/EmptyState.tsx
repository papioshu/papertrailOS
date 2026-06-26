// Branded empty state — a Papertrail OS ticket, not a blank panel. Headline
// states the situation; hint points to the next action.
export function EmptyState({
  title,
  hint,
  eyebrow = "Papertrail OS",
}: {
  title: string;
  hint?: string;
  eyebrow?: string;
}) {
  return (
    <div className="tt-card tt-scan relative overflow-hidden rounded-md border border-dashed border-line px-6 py-14 text-center">
      <div className="tt-label mb-2 opacity-70">{eyebrow}</div>
      <div className="tt-display text-xl text-fg">{title}</div>
      {hint && <p className="mx-auto mt-2 max-w-xs text-xs text-muted">{hint}</p>}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-[2px] opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="block w-px bg-violet-soft" style={{ height: i % 3 ? 8 : 12 }} />
        ))}
      </div>
    </div>
  );
}
