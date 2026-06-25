"use client";

import { useState, useTransition } from "react";

type DispatchResult = { status: "drafted" | "sent" | "blocked"; reason?: string; detail?: string };

export type SendDraft = {
  id: string;
  channel: string;
  approved: boolean;
  compliancePassed: boolean;
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
};

export function SendPanel({
  slug,
  mode,
  gmail,
  drafts,
  sendStatus,
  dispatch,
  markContacted,
}: {
  slug: string;
  mode: string;
  gmail: { configured: boolean; connected: boolean; email?: string | null };
  drafts: SendDraft[];
  sendStatus: Record<string, { status: string; error?: string | null }>;
  dispatch: (draftId: string) => Promise<DispatchResult>;
  markContacted: () => Promise<{ ok?: boolean }>;
}) {
  const [pending, start] = useTransition();
  const [results, setResults] = useState<Record<string, string>>({});

  const actionLabel = mode === "draft_only" ? "Create Gmail draft" : "Send / Queue";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="tt-label">Sending</span>
        <span className="tt-label capitalize">{mode.replace("_", " ")}</span>
      </div>

      {/* Connection status */}
      {!gmail.configured ? (
        <p className="text-[0.7rem] text-gold">
          Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
          and GMAIL_REDIRECT_URI to enable Gmail.
        </p>
      ) : gmail.connected ? (
        <p className="text-[0.7rem] text-muted">
          Connected: <span className="text-lime">{gmail.email}</span>
        </p>
      ) : (
        <a
          href={`/api/google/connect?profile=${slug}`}
          className="inline-block rounded-md border border-line px-2.5 py-1 text-xs hover:border-violet"
        >
          Connect Gmail
        </a>
      )}

      {drafts.length === 0 ? (
        <p className="text-[0.7rem] text-muted">No email-channel drafts to send yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {drafts.map((d) => {
            const status = sendStatus[d.id]?.status;
            const result = results[d.id];
            return (
              <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                <span>{CHANNEL_LABEL[d.channel] ?? d.channel}</span>
                <span className="flex items-center gap-2">
                  {status && (
                    <span
                      className={
                        status === "sent"
                          ? "text-lime"
                          : status === "drafted"
                            ? "text-violet-soft"
                            : "text-signal"
                      }
                    >
                      {status}
                    </span>
                  )}
                  <button
                    disabled={pending || status === "sent"}
                    onClick={() =>
                      start(() =>
                        dispatch(d.id).then((r) =>
                          setResults((m) => ({ ...m, [d.id]: r.detail ?? r.reason ?? r.status })),
                        ),
                      )
                    }
                    className="rounded border border-line px-2 py-0.5 hover:border-violet disabled:opacity-40"
                  >
                    {actionLabel}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {Object.entries(results).map(([id, msg]) => (
        <p key={id} className="text-[0.7rem] text-muted">
          {CHANNEL_LABEL[drafts.find((d) => d.id === id)?.channel ?? ""] ?? ""}: {msg}
        </p>
      ))}

      <button
        disabled={pending}
        onClick={() => start(() => markContacted().then(() => {}))}
        className="rounded-md border border-line px-2.5 py-1 text-xs hover:border-violet disabled:opacity-50"
      >
        Mark contacted
      </button>
    </div>
  );
}
