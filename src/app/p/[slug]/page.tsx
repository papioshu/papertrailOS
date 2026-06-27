import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileRole } from "@/lib/access";
import { getProfileBrand } from "@/lib/profiles";
import { prisma } from "@/lib/prisma";
import { listCampaigns } from "@/lib/campaigns";
import { listLeads } from "@/lib/leads";
import { ARCHIVED_STATUSES } from "@/lib/leadStatus";
import { gradeLead } from "@/lib/grade/gradingEngine";
import { matchOffer } from "@/lib/offer/offerMatch";
import type { AuditScores, Finding } from "@/lib/audit/auditEngine";
import type { ProfileSlug } from "@/lib/profiles";
import { roleCan } from "@/lib/rbac";
import { WorkflowRail, type RailState } from "@/components/workflow/WorkflowRail";
import { RunLeadTrail } from "@/components/automation/RunLeadTrail";
import { CampaignBar } from "@/components/campaigns/CampaignBar";
import { LeadTools } from "@/components/leads/LeadTools";
import { RunAudit } from "@/components/leads/RunAudit";
import { LeadTable, type LeadRow } from "@/components/leads/LeadTable";
import { DraftPanel, type DraftRow } from "@/components/outreach/DraftPanel";
import { SendPanel } from "@/components/outreach/SendPanel";
import { ReplyRadarPanel } from "@/components/outreach/ReplyRadarPanel";
import { googleConfigured } from "@/lib/gmail/gmail";
import {
  createCampaignAction,
  addLeadAction,
  importCsvAction,
  runAuditAction,
  updateLeadStatusAction,
  generateDraftsAction,
  updateDraftAction,
  approveDraftAction,
  dispatchDraftAction,
  markContactedAction,
  syncRepliesAction,
  runFollowupsAction,
  runLeadTrailAction,
} from "./actions";

const CHANNEL_ORDER = ["email", "dm", "call", "followup1", "followup2"];

export default async function WorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string; lead?: string }>;
}) {
  const { slug } = await params;
  const { c, lead: leadParam } = await searchParams;
  const brand = getProfileBrand(slug);
  const role = await getProfileRole(slug);
  if (!brand) notFound();
  if (!role) return <AccessPanel />;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { settings: true, gmail: true },
  });
  if (!profile) return <SeedPanel />;

  const campaigns = await listCampaigns(profile.id);
  const activeId = c && campaigns.some((cm) => cm.id === c) ? c : null;
  const leads = await listLeads(profile.id, activeId ?? undefined);

  const selectedLead = leadParam
    ? await prisma.lead.findFirst({
        where: { id: leadParam, profileId: profile.id },
        include: {
          audits: { orderBy: { createdAt: "desc" }, take: 1 },
          drafts: true,
          sendItems: true,
          replies: { orderBy: { receivedAt: "desc" } },
          followups: true,
        },
      })
    : null;

  const glow = { ["--glow" as string]: brand.accent };
  const cap = profile.settings?.dailySendCap ?? 25;
  const mode = (profile.settings?.agentMode ?? "draft_only").replace("_", " ");

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    category: l.category,
    city: l.city,
    leadScore: l.leadScore,
    offerAngle: l.offerAngle,
    status: l.status,
    email: l.email,
    phone: l.phone,
    website: l.website,
  }));

  // Profile-wide pipeline counts for the Workflow Rail.
  const [
    leadsTotal,
    withWebsite,
    gradedCount,
    auditedGroups,
    draftedGroups,
    approvedCount,
    sentCount,
    archivedAll,
  ] = await Promise.all([
    prisma.lead.count({ where: { profileId: profile.id } }),
    prisma.lead.count({ where: { profileId: profile.id, NOT: { website: null } } }),
    prisma.lead.count({ where: { profileId: profile.id, NOT: { leadScore: null } } }),
    prisma.websiteAudit.groupBy({ by: ["leadId"], where: { profileId: profile.id } }),
    prisma.outreachDraft.groupBy({ by: ["leadId"], where: { profileId: profile.id } }),
    prisma.outreachDraft.count({ where: { profileId: profile.id, approved: true } }),
    prisma.sendQueue.count({ where: { profileId: profile.id, status: "sent" } }),
    prisma.lead.count({ where: { profileId: profile.id, status: { in: [...ARCHIVED_STATUSES] } } }),
  ]);

  // Reply Radar + follow-up data.
  const [repliesCount, recentReplies, classGroups, followupScheduled, followupSent] =
    await Promise.all([
      prisma.reply.count({ where: { profileId: profile.id } }),
      prisma.reply.findMany({ where: { profileId: profile.id }, orderBy: { receivedAt: "desc" }, take: 8 }),
      prisma.reply.groupBy({ by: ["classification"], where: { profileId: profile.id }, _count: { _all: true } }),
      prisma.followup.count({ where: { profileId: profile.id, status: "scheduled" } }),
      prisma.followup.count({ where: { profileId: profile.id, status: "sent" } }),
    ]);
  const classCounts = classGroups.map((g) => ({ label: g.classification, count: g._count._all }));
  const lastSignal = recentReplies[0]?.receivedAt ?? null;

  const railCounts = [
    { key: "collect", label: "Collect", count: leadsTotal },
    { key: "enrich", label: "Enrich", count: withWebsite },
    { key: "audit", label: "Audit", count: auditedGroups.length },
    { key: "grade", label: "Grade", count: gradedCount },
    { key: "draft", label: "Draft", count: draftedGroups.length },
    { key: "approve", label: "Approve", count: approvedCount },
    { key: "send", label: "Send", count: sentCount },
    { key: "reply", label: "Reply Radar", count: repliesCount },
    { key: "followup", label: "Follow Up", count: followupScheduled + followupSent },
    { key: "archive", label: "Archive", count: archivedAll },
  ];
  let frontier = -1;
  railCounts.forEach((s, i) => {
    if (s.count > 0) frontier = i;
  });
  const railSteps = railCounts.map((s, i) => ({
    ...s,
    state: (i < frontier ? "complete" : i === frontier ? "active" : "inactive") as RailState,
  }));
  if (frontier === -1) railSteps[0].state = "active";

  const boundCreateCampaign = createCampaignAction.bind(null, slug);
  const boundAddLead = addLeadAction.bind(null, slug, activeId);
  const boundImport = importCsvAction.bind(null, slug, activeId);
  const boundRunAudit = runAuditAction.bind(null, slug, activeId);
  const boundUpdateStatus = updateLeadStatusAction.bind(null, slug);
  const boundSync = syncRepliesAction.bind(null, slug);
  const boundFollowups = runFollowupsAction.bind(null, slug);
  const boundRunTrail = runLeadTrailAction.bind(null, slug, activeId);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header
        className="tt-card tt-scan tt-glow mb-6 flex flex-wrap items-center justify-between gap-4 p-5"
        style={glow}
      >
        <div className="flex items-center gap-4">
          <div
            className="grid h-12 w-12 place-items-center rounded-lg border border-line text-sm font-bold"
            style={{ color: brand.accent }}
          >
            {brand.short}
          </div>
          <div>
            <div className="tt-label" style={{ color: brand.accent }}>
              {brand.tagline}
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{brand.name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Stat label="Role" value={role.replace("_", " ")} />
          <Stat label="Agent mode" value={mode} />
          <Stat label="Daily cap" value={`0 / ${cap}`} />
          <Stat label="Safety" value="Locked" tone="lime" />
          <Link
            href={`/p/${slug}/archive`}
            className="tt-label rounded-md border border-line px-3 py-1.5 hover:border-violet"
          >
            Archive
          </Link>
          <Link
            href="/select"
            className="tt-label rounded-md border border-line px-3 py-1.5 hover:border-violet"
          >
            Switch
          </Link>
        </div>
      </header>

      <section className="tt-card mb-6 p-5">
        <div className="tt-label mb-3">Campaign</div>
        <CampaignBar
          slug={slug}
          campaigns={campaigns.map((cm) => ({ id: cm.id, name: cm.name }))}
          activeId={activeId}
          createCampaign={boundCreateCampaign}
        />
      </section>

      <div className="mb-6">
        <RunLeadTrail accent={brand.accent} run={boundRunTrail} />
      </div>

      <div className="mb-6">
        <WorkflowRail steps={railSteps} accent={brand.accent} />
      </div>

      <section className="tt-card mb-6 space-y-4 p-5">
        <div className="tt-label">Leads</div>
        <LeadTools slug={slug} campaignId={activeId} addLead={boundAddLead} importCsv={boundImport} />
        <RunAudit runAudit={boundRunAudit} leadCount={leads.length} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="tt-card p-5 lg:col-span-2">
          <div className="tt-label mb-3">
            Lead table {activeId ? "· campaign" : "· all"} ({leads.length})
          </div>
          <LeadTable
            leads={rows}
            updateStatus={boundUpdateStatus}
            slug={slug}
            campaignId={activeId}
            selectedId={selectedLead?.id ?? null}
          />
        </div>
        <div className="tt-card p-5">
          <div className="tt-label mb-3">Selected lead</div>
          {selectedLead ? (
            <LeadDetail
              lead={selectedLead}
              audit={selectedLead.audits[0] ?? null}
              slug={slug}
              canApprove={roleCan(role, "approve_send")}
              drafts={[...selectedLead.drafts]
                .sort((a, b) => CHANNEL_ORDER.indexOf(a.channel) - CHANNEL_ORDER.indexOf(b.channel))
                .map((d): DraftRow => ({
                  id: d.id,
                  channel: d.channel,
                  subject: d.subject,
                  body: d.body,
                  complianceStatus: d.complianceStatus,
                  complianceRisk: d.complianceRisk,
                  complianceReasons: Array.isArray(d.complianceJson)
                    ? (d.complianceJson as string[])
                    : [],
                  approved: d.approved,
                  providerUsed: d.providerUsed,
                }))}
              generateDrafts={generateDraftsAction.bind(null, slug, selectedLead.id)}
              updateDraft={updateDraftAction.bind(null, slug)}
              approveDraft={approveDraftAction.bind(null, slug)}
              mode={profile.settings?.agentMode ?? "draft_only"}
              gmail={{
                configured: googleConfigured(),
                connected: Boolean(profile.gmail),
                email: profile.gmail?.email ?? null,
              }}
              sendStatus={Object.fromEntries(
                selectedLead.sendItems.map((s) => [s.draftId, { status: s.status, error: s.error }]),
              )}
              dispatchDraft={dispatchDraftAction.bind(null, slug)}
              markContacted={markContactedAction.bind(null, slug, selectedLead.id)}
              replies={selectedLead.replies.map((r) => ({
                id: r.id,
                classification: r.classification,
                snippet: r.snippet,
                receivedAt: r.receivedAt.toISOString(),
              }))}
              followups={selectedLead.followups.map((f) => ({
                channel: f.channel,
                status: f.status,
                scheduledFor: f.scheduledFor.toISOString(),
              }))}
            />
          ) : (
            <p className="text-sm text-muted">
              Select a lead to see contact info, audit findings, score breakdown,
              and offer match.
            </p>
          )}
        </div>
      </section>

      <div className="mt-6">
        <ReplyRadarPanel
          gmail={{
            configured: googleConfigured(),
            connected: Boolean(profile.gmail),
            email: profile.gmail?.email ?? null,
          }}
          classCounts={classCounts}
          replies={recentReplies.map((r) => ({
            id: r.id,
            classification: r.classification,
            fromEmail: r.fromEmail,
            snippet: r.snippet,
            receivedAt: r.receivedAt.toISOString(),
          }))}
          followups={{ scheduled: followupScheduled, sent: followupSent }}
          lastSignal={lastSignal ? lastSignal.toISOString() : null}
          sync={boundSync}
          runFollowups={boundFollowups}
        />
      </div>
    </main>
  );
}

type DetailLead = {
  businessName: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  leadScore: number | null;
  offerAngle: string | null;
  status: string;
  instagram: string | null;
  reviewCount: number | null;
};
type DetailAudit = {
  reachable: boolean;
  websiteScore: number;
  mobileScore: number;
  seoScore: number;
  conversionScore: number;
  trustScore: number;
  contentScore: number;
  summary: string;
  findingsJson: unknown;
} | null;

function LeadDetail({
  lead,
  audit,
  slug,
  drafts,
  canApprove,
  generateDrafts,
  updateDraft,
  approveDraft,
  mode,
  gmail,
  sendStatus,
  dispatchDraft,
  markContacted,
  replies,
  followups,
}: {
  lead: DetailLead;
  audit: DetailAudit;
  slug: string;
  drafts: DraftRow[];
  canApprove: boolean;
  generateDrafts: () => Promise<{ ok?: boolean; error?: string } | { ok: boolean; composed: number; provider: string }>;
  updateDraft: (id: string, subject: string, body: string) => Promise<{ ok?: boolean; error?: string }>;
  approveDraft: (id: string) => Promise<{ ok?: boolean; error?: string }>;
  mode: string;
  gmail: { configured: boolean; connected: boolean; email: string | null };
  sendStatus: Record<string, { status: string; error?: string | null }>;
  dispatchDraft: (draftId: string) => Promise<{ status: "drafted" | "sent" | "blocked"; reason?: string; detail?: string }>;
  markContacted: () => Promise<{ ok?: boolean }>;
  replies: { id: string; classification: string; snippet: string; receivedAt: string }[];
  followups: { channel: string; status: string; scheduledFor: string }[];
}) {
  const scores: AuditScores | null =
    audit && audit.reachable
      ? {
          websiteScore: audit.websiteScore,
          mobileScore: audit.mobileScore,
          seoScore: audit.seoScore,
          conversionScore: audit.conversionScore,
          trustScore: audit.trustScore,
          contentScore: audit.contentScore,
        }
      : null;
  const grade = gradeLead(lead, scores);
  const offer = matchOffer(slug as ProfileSlug, lead, scores);
  const findings = (audit?.findingsJson as Finding[] | undefined) ?? [];
  const findingColor = (s: Finding["status"]) =>
    s === "pass" ? "text-lime" : s === "warn" ? "text-gold" : "text-signal";

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-base font-semibold">{lead.businessName}</div>
        <div className="text-xs text-muted">{lead.status}</div>
      </div>

      <div className="space-y-1 text-xs text-muted">
        {lead.email && <div>✉ {lead.email}</div>}
        {lead.phone && <div>☎ {lead.phone}</div>}
        {lead.website && <div>🔗 {lead.website}</div>}
        {(lead.address || lead.city) && <div>📍 {[lead.address, lead.city].filter(Boolean).join(", ")}</div>}
      </div>

      <div className="rounded-md border border-line p-3">
        <div className="flex items-center justify-between">
          <span className="tt-label">Lead grade</span>
          <span className="text-lg font-semibold">{grade.score}</span>
        </div>
        <div className="text-xs" style={{ color: "var(--color-violet-soft)" }}>{grade.band}</div>
        <ul className="mt-2 space-y-0.5 text-[0.7rem] text-muted">
          {grade.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-line p-3">
        <span className="tt-label">Offer match</span>
        <div className="font-medium">{offer.offer}</div>
        <div className="text-xs text-muted">{offer.rationale}</div>
      </div>

      <div className="rounded-md border border-line p-3">
        <DraftPanel
          drafts={drafts}
          canApprove={canApprove}
          generate={generateDrafts}
          updateDraft={updateDraft}
          approveDraft={approveDraft}
        />
      </div>

      <div className="rounded-md border border-line p-3">
        <SendPanel
          slug={slug}
          mode={mode}
          gmail={gmail}
          drafts={drafts
            .filter((d) => d.channel === "email" || d.channel === "followup1" || d.channel === "followup2")
            .map((d) => ({
              id: d.id,
              channel: d.channel,
              approved: d.approved,
              compliancePassed: d.complianceStatus === "pass",
            }))}
          sendStatus={sendStatus}
          dispatch={dispatchDraft}
          markContacted={markContacted}
        />
      </div>

      {(replies.length > 0 || followups.length > 0) && (
        <div className="rounded-md border border-line p-3">
          <span className="tt-label">Reply Radar · Follow-up</span>
          {replies.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {replies.slice(0, 3).map((r) => (
                <li key={r.id} className="text-xs">
                  <span className="font-semibold" style={{ color: "var(--color-violet-soft)" }}>
                    {r.classification}
                  </span>
                  <span className="text-muted"> · {new Date(r.receivedAt).toLocaleDateString()}</span>
                  <p className="line-clamp-2 text-fg/75">{r.snippet}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted">No replies yet.</p>
          )}
          {followups.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[0.72rem] text-muted">
              {followups.map((f) => (
                <li key={f.channel} className="flex justify-between">
                  <span>{f.channel === "followup1" ? "Follow-up 1" : "Follow-up 2"}</span>
                  <span>
                    {f.status} · {new Date(f.scheduledFor).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {audit ? (
        audit.reachable ? (
          <div className="rounded-md border border-line p-3">
            <span className="tt-label">Website audit</span>
            <p className="mt-1 text-xs text-muted">{audit.summary}</p>
            <div className="mt-2 space-y-1">
              {(
                [
                  ["Overall", scores!.websiteScore],
                  ["Mobile", scores!.mobileScore],
                  ["SEO", scores!.seoScore],
                  ["Conversion", scores!.conversionScore],
                  ["Trust", scores!.trustScore],
                  ["Content", scores!.contentScore],
                ] as const
              ).map(([label, v]) => (
                <ScoreBar key={label} label={label} value={v} />
              ))}
            </div>
            <details className="mt-3">
              <summary className="tt-label cursor-pointer">Findings ({findings.length})</summary>
              <ul className="mt-2 space-y-1.5 text-xs">
                {findings.map((f) => (
                  <li key={f.key}>
                    <span className={findingColor(f.status)}>● </span>
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted"> — {f.evidence}</span>
                    {f.status !== "pass" && (
                      <div className="pl-4 text-[0.7rem] text-muted">→ {f.suggestion}</div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : (
          <div className="rounded-md border border-line p-3 text-xs text-muted">
            {audit.summary}
          </div>
        )
      ) : (
        <div className="rounded-md border border-dashed border-line p-3 text-xs text-muted">
          {lead.website
            ? "Not audited yet — run Audit + Grade."
            : "No website on file; grading uses available signals."}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "var(--color-lime)" : value >= 50 ? "var(--color-gold)" : "var(--color-signal)";
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[0.7rem] text-muted">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded bg-ink-2">
        <span className="block h-full rounded" style={{ width: `${value}%`, background: color }} />
      </span>
      <span className="w-7 text-right text-[0.7rem]">{value}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "lime" }) {
  return (
    <div className="rounded-md border border-line bg-ink-2 px-3 py-1.5">
      <div className="tt-label">{label}</div>
      <div
        className="text-sm font-medium capitalize"
        style={tone === "lime" ? { color: "var(--color-lime)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function AccessPanel() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="tt-card p-6">
        <div className="tt-label text-gold">No access</div>
        <p className="mt-2 text-sm text-muted">
          You don&apos;t have access to this profile (or the database is not
          configured).{" "}
          <Link href="/select" className="text-violet underline">
            Back to selector
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function SeedPanel() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="tt-card p-6">
        <div className="tt-label text-gold">Profile not seeded</div>
        <p className="mt-2 text-sm text-muted">
          This profile is missing from the database. Run{" "}
          <code className="text-fg">npm run db:seed</code>.
        </p>
      </div>
    </main>
  );
}
