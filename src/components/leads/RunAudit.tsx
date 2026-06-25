"use client";

import { useActionState } from "react";

type Result =
  | { ok?: boolean; audited?: number; unreachable?: number; graded?: number; error?: string }
  | null;

export function RunAudit({
  runAudit,
  leadCount,
}: {
  runAudit: () => Promise<Result>;
  leadCount: number;
}) {
  const [state, action, pending] = useActionState(async () => runAudit(), null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button
        disabled={pending || leadCount === 0}
        className="rounded-md bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        title={leadCount === 0 ? "Add leads first" : "Audit websites and grade leads"}
      >
        {pending ? "Running audit + grade…" : "Run Audit + Grade"}
      </button>
      {pending && (
        <span className="tt-label animate-pulse text-violet-soft">
          scanning {leadCount} lead(s)…
        </span>
      )}
      {state?.ok && (
        <span className="text-xs text-lime">
          Graded {state.graded}; audited {state.audited}; {state.unreachable} unreachable.
        </span>
      )}
      {state?.error && <span className="text-xs text-signal">{state.error}</span>}
    </form>
  );
}
