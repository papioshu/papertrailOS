"use client";

import { useState, useTransition } from "react";
import { AutoAnimate } from "@/components/AutoAnimate";

export type DraftRow = {
  id: string;
  channel: string;
  subject: string | null;
  body: string;
  complianceStatus: string;
  complianceRisk: string | null;
  complianceReasons: string[];
  approved: boolean;
  providerUsed: string;
};

type Result = { ok?: boolean; error?: string } | null;

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  dm: "DM",
  call: "Call Script",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
};
const CHANNEL_CODE: Record<string, string> = {
  email: "EM",
  dm: "DM",
  call: "CS",
  followup1: "F1",
  followup2: "F2",
};

function Barcode({ seed }: { seed: string }) {
  return (
    <span className="flex h-4 items-end gap-[1px]" aria-hidden>
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="block w-px bg-current"
          style={{ height: ((seed.charCodeAt(i % seed.length) + i) % 3) + 2 + "px" }}
        />
      ))}
    </span>
  );
}

export function DraftPanel({
  drafts,
  canApprove,
  generate,
  updateDraft,
  approveDraft,
}: {
  drafts: DraftRow[];
  canApprove: boolean;
  generate: () => Promise<Result>;
  updateDraft: (id: string, subject: string, body: string) => Promise<Result>;
  approveDraft: (id: string) => Promise<Result>;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="tt-label" style={{ color: "var(--color-violet-soft)" }}>
            Draft Room
          </div>
          <div className="tt-display text-sm">Outreach Draft</div>
        </div>
        <button
          disabled={pending}
          onClick={() => start(() => generate().then(() => {}))}
          className="rounded-md border border-line px-2.5 py-1 text-xs hover:border-violet disabled:opacity-50"
        >
          {pending ? "Composing…" : drafts.length ? "Regenerate" : "Generate drafts"}
        </button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-xs text-muted">
          No drafts ready. Compose email, DM, call script, and two follow-ups from
          this lead&apos;s research and offer.
        </p>
      ) : (
        <AutoAnimate className="space-y-3">
          {drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              canApprove={canApprove}
              updateDraft={updateDraft}
              approveDraft={approveDraft}
            />
          ))}
        </AutoAnimate>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  canApprove,
  updateDraft,
  approveDraft,
}: {
  draft: DraftRow;
  canApprove: boolean;
  updateDraft: (id: string, subject: string, body: string) => Promise<Result>;
  approveDraft: (id: string) => Promise<Result>;
}) {
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const passed = draft.complianceStatus === "pass";
  const dirty = subject !== (draft.subject ?? "") || body !== draft.body;

  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-ink-2">
      {/* Ticket header bar */}
      <div className="flex items-center justify-between border-b border-dashed border-line bg-panel/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded border border-line px-1.5 py-0.5 text-[0.6rem] font-semibold text-violet-soft">
            {CHANNEL_CODE[draft.channel] ?? "PT"}
          </span>
          <span className="tt-display text-xs">{CHANNEL_LABEL[draft.channel] ?? draft.channel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[0.58rem] uppercase tracking-widest ${
              passed
                ? "border-lime/40 text-lime"
                : "border-signal/40 text-signal"
            }`}
          >
            {passed ? "✓ All clear" : `Check · ${draft.complianceRisk ?? "fail"}`}
          </span>
          <span className="text-violet-soft/50">
            <Barcode seed={draft.id} />
          </span>
        </div>
      </div>

      {/* Approved stamp */}
      {draft.approved && (
        <span className="pointer-events-none absolute right-3 top-12 -rotate-12 rounded border border-lime/60 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-lime/80">
          Approved
        </span>
      )}

      <div className="space-y-2 p-3">
        {draft.subject !== null && (
          <label className="block">
            <span className="tt-label">Subject line</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-ink px-2 py-1.5 text-sm outline-none focus:border-violet"
            />
          </label>
        )}
        <label className="block">
          <span className="tt-label">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="mt-1 w-full rounded border border-line bg-ink px-2 py-1.5 text-xs leading-relaxed outline-none focus:border-violet"
          />
        </label>

        {!passed && draft.complianceReasons.length > 0 && (
          <ul className="space-y-0.5 text-[0.7rem] text-signal">
            {draft.complianceReasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 border-t border-dashed border-line pt-2">
          <button
            disabled={pending || !dirty}
            onClick={() =>
              start(() =>
                updateDraft(draft.id, subject, body).then((r) =>
                  setMsg(r?.error ?? "Saved & re-checked."),
                ),
              )
            }
            className="rounded-md border border-line px-2.5 py-1 text-xs hover:border-violet disabled:opacity-40"
          >
            Save
          </button>
          {canApprove && (
            <button
              disabled={pending || !passed || draft.approved || dirty}
              title={!passed ? "Compliance must pass first" : dirty ? "Save edits first" : ""}
              onClick={() =>
                start(() =>
                  approveDraft(draft.id).then((r) => setMsg(r?.error ?? "Approved.")),
                )
              }
              className="rounded-md bg-violet px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              Approve
            </button>
          )}
          <span className="tt-label ml-auto">{draft.providerUsed}</span>
        </div>
        {msg && <p className="text-[0.7rem] text-muted">{msg}</p>}
      </div>
    </div>
  );
}
