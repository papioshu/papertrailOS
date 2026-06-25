import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileRole } from "@/lib/access";
import { getProfileBrand } from "@/lib/profiles";
import { prisma } from "@/lib/prisma";
import { listCampaigns } from "@/lib/campaigns";
import { listLeads } from "@/lib/leads";
import { ARCHIVED_STATUSES } from "@/lib/leadStatus";
import { AutoAnimate } from "@/components/AutoAnimate";
import { CampaignBar } from "@/components/campaigns/CampaignBar";
import { LeadTools } from "@/components/leads/LeadTools";
import { LeadTable, type LeadRow } from "@/components/leads/LeadTable";
import {
  createCampaignAction,
  addLeadAction,
  importCsvAction,
  updateLeadStatusAction,
} from "./actions";

const STEPS = [
  "Collect", "Research", "Audit", "Grade", "Draft",
  "Approve", "Send", "Follow Up", "Archive",
] as const;

export default async function WorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { slug } = await params;
  const { c } = await searchParams;
  const brand = getProfileBrand(slug);
  const role = await getProfileRole(slug);
  if (!brand) notFound();
  if (!role) return <AccessPanel />;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    include: { settings: true },
  });
  if (!profile) return <SeedPanel />;

  const campaigns = await listCampaigns(profile.id);
  const activeId = c && campaigns.some((cm) => cm.id === c) ? c : null;
  const leads = await listLeads(profile.id, activeId ?? undefined);

  const glow = { ["--glow" as string]: brand.accent };
  const cap = profile.settings?.dailySendCap ?? 25;
  const mode = (profile.settings?.agentMode ?? "draft_only").replace("_", " ");
  const archivedCount = leads.filter((l) => ARCHIVED_STATUSES.has(l.status)).length;

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

  const boundCreateCampaign = createCampaignAction.bind(null, slug);
  const boundAddLead = addLeadAction.bind(null, slug, activeId);
  const boundImport = importCsvAction.bind(null, slug, activeId);
  const boundUpdateStatus = updateLeadStatusAction.bind(null, slug);

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

      <section className="tt-card tt-scan mb-6 p-5" style={glow}>
        <div className="tt-label mb-4">Workflow</div>
        <AutoAnimate as="ol" className="flex flex-wrap gap-2">
          {STEPS.map((step, i) => {
            const count =
              step === "Collect" ? leads.length : step === "Archive" ? archivedCount : 0;
            return (
              <li
                key={step}
                className="flex items-center gap-2 rounded-md border border-line bg-ink-2 px-3 py-2"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full border border-line text-[0.6rem] text-muted">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
                <span className="tt-label">{count}</span>
              </li>
            );
          })}
        </AutoAnimate>
      </section>

      <section className="tt-card mb-6 p-5">
        <div className="tt-label mb-3">Leads</div>
        <LeadTools slug={slug} campaignId={activeId} addLead={boundAddLead} importCsv={boundImport} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="tt-card p-5 lg:col-span-2">
          <div className="tt-label mb-3">
            Lead table {activeId ? "· campaign" : "· all"} ({leads.length})
          </div>
          <LeadTable leads={rows} updateStatus={boundUpdateStatus} />
        </div>
        <div className="tt-card p-5">
          <div className="tt-label mb-3">Selected lead</div>
          <p className="text-sm text-muted">
            Enrichment, website audit, score breakdown, offer match, and drafts
            attach here in Phases 3–4.
          </p>
        </div>
      </section>
    </main>
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
