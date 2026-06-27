"use client";

import { useActionState } from "react";
import { AutoAnimate } from "@/components/AutoAnimate";

type Stage = { stage: string; detail: string };
type Result = { ok?: boolean; jobId?: string; log?: Stage[] } | null;

const FIELD =
  "rounded-md border border-line bg-ink-2 px-2.5 py-2 text-sm outline-none focus:border-violet";

export function RunLeadTrail({
  accent,
  run,
}: {
  accent: string;
  run: (fd: FormData) => Promise<Result>;
}) {
  const [state, action, pending] = useActionState(
    async (_p: Result, fd: FormData) => run(fd),
    null,
  );

  return (
    <section className="tt-card tt-glow tt-scan p-5" style={{ ["--glow" as string]: accent }}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="tt-label" style={{ color: "var(--color-violet-soft)" }}>
            Lead Trail · Automation
          </div>
          <div className="tt-display text-sm">Run the whole workflow</div>
        </div>
        <span className="tt-label hidden sm:inline">Collect → Archive</span>
      </div>

      <form action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <select name="sourceType" defaultValue="manual" className={FIELD} aria-label="Source">
          <option value="manual">Existing leads</option>
          <option value="local">Local search</option>
          <option value="event">Event search</option>
        </select>
        <input name="niche" placeholder="Niche / what" className={FIELD} />
        <input name="city" placeholder="City" className={FIELD} />
        <input name="state" placeholder="State" className={FIELD} />
        <input name="maxLeads" type="number" placeholder="25" className={FIELD} />
        <button
          disabled={pending}
          className="rounded-md px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
          style={{ background: accent }}
        >
          {pending ? "Running…" : "Run Lead Trail"}
        </button>
        <label className="col-span-2 flex items-center gap-2 text-[0.7rem] text-muted sm:col-span-6">
          <input type="checkbox" name="autoApprove" className="accent-violet" />
          Auto-approve compliant email drafts (still gated by send mode + daily cap)
        </label>
      </form>

      {(pending || state?.log) && (
        <AutoAnimate as="ol" className="mt-4 space-y-1.5">
          {pending && !state?.log && (
            <li className="tt-label animate-pulse text-violet-soft">running the trail…</li>
          )}
          {state?.log?.map((s, i) => {
            const err = s.detail.startsWith("error:");
            return (
              <li key={i} className="flex items-start gap-3 text-xs">
                <span className="tt-display w-28 shrink-0" style={{ color: accent }}>
                  {s.stage}
                </span>
                <span className={err ? "text-signal" : "text-muted"}>{s.detail}</span>
              </li>
            );
          })}
        </AutoAnimate>
      )}
    </section>
  );
}
