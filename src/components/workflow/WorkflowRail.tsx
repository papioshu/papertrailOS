import { Fragment, type ReactNode } from "react";

// The 10-stage Workflow Rail. Matches the Papertrail OS pipeline aesthetic
// (numbered ticket tiles, line-icon per stage, count badges, active glow,
// completed checks). Display-only; state + counts come from real data.

export type RailState = "active" | "complete" | "inactive";
export type RailStep = { key: string; label: string; count: number; state: RailState };

const I = (paths: ReactNode) => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const ICONS: Record<string, ReactNode> = {
  collect: I(<><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2" /></>),
  enrich: I(<><path d="M8 3v10M3 8h10" /></>),
  audit: I(<><circle cx="7" cy="7" r="4" /><path d="M10 10l4 4" /></>),
  grade: I(<><path d="M3 13V8M8 13V4M13 13V6" /></>),
  draft: I(<><path d="M11 2l3 3-8 8-4 1 1-4z" /></>),
  approve: I(<><path d="M3 8.5l3.5 3.5L13 4" /></>),
  send: I(<><path d="M14 2L2 7l5 2 2 5z" /></>),
  reply: I(<><path d="M8 8a5 5 0 0 1 5-5" /><path d="M8 8a3 3 0 0 1 3-3" /><circle cx="8" cy="8" r="1" /></>),
  followup: I(<><path d="M13 8a5 5 0 1 1-1.5-3.5" /><path d="M13 3v2h-2" /></>),
  archive: I(<><path d="M2 5h12v8H2zM2 5l1-2h10l1 2M6 8h4" /></>),
};

export function WorkflowRail({ steps, accent }: { steps: RailStep[]; accent: string }) {
  return (
    <div className="tt-card tt-scan p-5" style={{ ["--glow" as string]: accent }}>
      <div className="mb-4 flex items-center justify-between">
        <span className="tt-label">Workflow Rail</span>
        <span className="tt-label hidden sm:inline">Collect → Archive</span>
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <Fragment key={step.key}>
            <Tile step={step} index={i} accent={accent} />
            {i < steps.length - 1 && (
              <span className="flex shrink-0 items-center px-0.5 text-muted/40" aria-hidden>
                <span className="h-px w-2.5 bg-line" />›
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Tile({ step, index, accent }: { step: RailStep; index: number; accent: string }) {
  const num = String(index + 1).padStart(2, "0");
  const active = step.state === "active";
  const complete = step.state === "complete";
  const isRadar = step.key === "reply" && active;

  const tone = active ? accent : complete ? "var(--color-lime)" : "var(--color-muted)";

  return (
    <div
      className={`relative flex w-[88px] shrink-0 flex-col items-center rounded-md border px-2 py-2 text-center ${
        isRadar ? "tt-radar" : ""
      }`}
      style={{
        borderColor: active
          ? accent
          : complete
            ? "color-mix(in srgb, var(--color-lime) 45%, transparent)"
            : "var(--color-line)",
        boxShadow: active ? `0 0 22px -8px ${accent}` : undefined,
        background: active
          ? `color-mix(in srgb, ${accent} 12%, var(--color-ink-2))`
          : "var(--color-ink-2)",
        opacity: step.state === "inactive" ? 0.45 : 1,
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span className="tt-label" style={active ? { color: accent } : undefined}>
          {num}
        </span>
        {complete ? (
          <span className="text-[0.7rem] leading-none text-lime">✓</span>
        ) : (
          <span
            className="rounded-full border px-1 text-[0.58rem] leading-tight"
            style={{
              borderColor: active ? accent : "var(--color-line)",
              color: active ? accent : "var(--color-muted)",
            }}
          >
            {step.count > 999 ? "999+" : step.count}
          </span>
        )}
      </div>
      <span className="my-1.5" style={{ color: tone }}>
        {ICONS[step.key]}
      </span>
      <span className="tt-display text-[0.6rem] leading-tight">{step.label}</span>
    </div>
  );
}
