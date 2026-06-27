"use client";

import { useState, useTransition } from "react";
import { AutoAnimate } from "@/components/AutoAnimate";

type SyncResult = { ok?: boolean; error?: string; scanned?: number; found?: number } | null;
type FollowResult = { ok?: boolean; sent?: number; skipped?: number } | null;

export type ReplyCard = {
  id: string;
  classification: string;
  fromEmail: string;
  snippet: string;
  receivedAt: string; // ISO
};

const CLASS_COLOR: Record<string, string> = {
  Interested: "var(--color-lime)",
  Question: "var(--color-violet-soft)",
  "Needs Manual Reply": "var(--color-gold)",
  "Not Interested": "var(--color-muted)",
  "Opt Out": "var(--color-signal)",
  Bounce: "var(--color-signal)",
  Complaint: "var(--color-signal)",
  Unknown: "var(--color-muted)",
};

export function ReplyRadarPanel({
  gmail,
  classCounts,
  replies,
  followups,
  lastSignal,
  sync,
  runFollowups,
}: {
  gmail: { configured: boolean; connected: boolean; email?: string | null };
  classCounts: { label: string; count: number }[];
  replies: ReplyCard[];
  followups: { scheduled: number; sent: number };
  lastSignal: string | null;
  sync: () => Promise<SyncResult>;
  runFollowups: () => Promise<FollowResult>;
}) {
  const [pending, start] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [followMsg, setFollowMsg] = useState<string | null>(null);

  return (
    <section className="tt-card tt-scan p-5" style={{ ["--glow" as string]: "var(--color-violet)" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="tt-label" style={{ color: "var(--color-violet-soft)" }}>
            Reply Radar · Signal · Classify · Connect
          </div>
          <div className="tt-display text-sm">Inbound signal</div>
        </div>
        <div className="flex gap-2">
          <button
            disabled={pending || !gmail.connected}
            onClick={() => start(() => sync().then((r) => setSyncMsg(r?.error ?? `Scanned ${r?.scanned ?? 0}, found ${r?.found ?? 0}.`)))}
            title={gmail.connected ? "" : "Connect Gmail first"}
            className="rounded-md bg-violet px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {pending ? "Scanning…" : "Sync replies"}
          </button>
          <button
            disabled={pending}
            onClick={() => start(() => runFollowups().then((r) => setFollowMsg(`Sent ${r?.sent ?? 0}, skipped ${r?.skipped ?? 0}.`)))}
            className="rounded-md border border-line px-3 py-1.5 text-xs hover:border-violet disabled:opacity-50"
          >
            Run follow-ups
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
        {/* Radar scope + sync status */}
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-full border border-line bg-ink">
            <div className="absolute inset-3 rounded-full border border-line/60" />
            <div className="absolute inset-9 rounded-full border border-line/40" />
            <div className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-line/50" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-line/50" />
            <div
              className="tt-sweep absolute inset-0 origin-center"
              style={{
                background:
                  "conic-gradient(from 0deg, color-mix(in srgb, var(--color-violet) 45%, transparent), transparent 90deg)",
                borderRadius: "9999px",
              }}
            />
          </div>
          <div className="rounded-md border border-line p-3 text-xs">
            <div className="tt-label mb-1">Sync status</div>
            {!gmail.configured ? (
              <span className="text-gold">Provider not configured</span>
            ) : gmail.connected ? (
              <>
                <div className="flex items-center gap-1.5 text-lime">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime" /> Online
                </div>
                <div className="mt-1 text-muted">{gmail.email}</div>
                <div className="text-muted">
                  Last signal: {lastSignal ? new Date(lastSignal).toLocaleString() : "—"}
                </div>
              </>
            ) : (
              <span className="text-muted">Gmail not connected</span>
            )}
          </div>
          {(syncMsg || followMsg) && (
            <p className="text-[0.7rem] text-muted">
              {syncMsg} {followMsg}
            </p>
          )}
        </div>

        {/* Classification + replies */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {classCounts.map((c) => (
              <span
                key={c.label}
                className="rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-widest"
                style={{ borderColor: CLASS_COLOR[c.label] ?? "var(--color-line)", color: CLASS_COLOR[c.label] ?? "var(--color-muted)" }}
              >
                {c.label} · {c.count}
              </span>
            ))}
            <span className="rounded-full border border-line px-2.5 py-1 text-[0.62rem] uppercase tracking-widest text-muted">
              Follow-ups · {followups.scheduled} scheduled / {followups.sent} sent
            </span>
          </div>

          {replies.length === 0 ? (
            <p className="text-xs text-muted">
              No replies yet. Run a sync after a send to pull inbound signal.
            </p>
          ) : (
            <AutoAnimate className="space-y-2">
              {replies.map((r) => (
                <div key={r.id} className="rounded-md border border-line bg-ink-2 p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[0.6rem] font-semibold uppercase tracking-widest"
                      style={{ color: CLASS_COLOR[r.classification] ?? "var(--color-muted)" }}
                    >
                      {r.classification}
                    </span>
                    <span className="tt-label">{new Date(r.receivedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-muted">{r.fromEmail}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-fg/80">{r.snippet}</p>
                </div>
              ))}
            </AutoAnimate>
          )}
        </div>
      </div>
    </section>
  );
}
