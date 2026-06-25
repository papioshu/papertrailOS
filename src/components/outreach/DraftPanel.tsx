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
  call: "Call script",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
};

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
        <span className="tt-label">Outreach drafts</span>
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
          No drafts yet. Generate email, DM, call script, and two follow-ups from
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
    <details className="rounded-md border border-line p-3" open={draft.channel === "email"}>
      <summary className="flex cursor-pointer items-center justify-between gap-2">
        <span className="text-sm font-medium">{CHANNEL_LABEL[draft.channel] ?? draft.channel}</span>
        <span className="flex items-center gap-2">
          {draft.approved && <span className="tt-label text-lime">approved</span>}
          <span
            className={`rounded px-1.5 py-0.5 text-[0.6rem] uppercase tracking-widest ${
              passed ? "text-lime" : "text-signal"
            }`}
          >
            {passed ? "compliant" : `check: ${draft.complianceRisk ?? "fail"}`}
          </span>
        </span>
      </summary>

      <div className="mt-3 space-y-2">
        {draft.subject !== null && (
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded border border-line bg-ink-2 px-2 py-1.5 text-sm outline-none focus:border-violet"
          />
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          className="w-full rounded border border-line bg-ink-2 px-2 py-1.5 text-xs leading-relaxed outline-none focus:border-violet"
        />

        {!passed && draft.complianceReasons.length > 0 && (
          <ul className="space-y-0.5 text-[0.7rem] text-signal">
            {draft.complianceReasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
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
          <span className="tt-label">{draft.providerUsed}</span>
        </div>
        {msg && <p className="text-[0.7rem] text-muted">{msg}</p>}
      </div>
    </details>
  );
}
