import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileRole } from "@/lib/access";
import { getProfileBrand } from "@/lib/profiles";

// The one-page profile workflow. Phase 1 ships the real shell: identity header,
// the Collect→Archive rail, and honest empty states. Step execution and the
// live lead table arrive in Phase 2+.
const STEPS = [
  "Collect",
  "Research",
  "Audit",
  "Grade",
  "Draft",
  "Approve",
  "Send",
  "Follow Up",
  "Archive",
] as const;

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = getProfileBrand(slug);
  const role = await getProfileRole(slug);
  if (!brand) notFound();
  if (!role) {
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

  const glow = { ["--glow" as string]: brand.accent };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Header / identity */}
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
          <Stat label="Agent mode" value="Draft only" />
          <Stat label="Manual approval" value="On" />
          <Stat label="Daily cap" value="0 / 25" />
          <Stat label="Safety" value="Locked" tone="lime" />
          <Link
            href="/select"
            className="tt-label rounded-md border border-line px-3 py-1.5 hover:border-violet"
          >
            Switch
          </Link>
        </div>
      </header>

      {/* Campaign input */}
      <section className="tt-card mb-6 p-5">
        <div className="tt-label mb-3">Campaign · Run Lead Trail</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Niche" placeholder="barbers" />
          <Field label="City" placeholder="Fort Worth" />
          <Field label="State" placeholder="TX" />
          <Field label="Max leads" placeholder="50" />
          <Field label="Source" placeholder="manual" />
          <button
            disabled
            title="Available in Phase 2"
            className="self-end rounded-md border border-line bg-violet/20 px-3 py-2 text-sm font-medium text-violet-soft"
          >
            Run Lead Trail
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-muted">
          Lead generation activates in Phase 2 (manual entry + CSV first).
        </p>
      </section>

      {/* Workflow rail */}
      <section className="tt-card tt-scan mb-6 p-5" style={glow}>
        <div className="tt-label mb-4">Workflow</div>
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className="flex items-center gap-2 rounded-md border border-line bg-ink-2 px-3 py-2"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full border border-line text-[0.6rem] text-muted">
                {i + 1}
              </span>
              <span className="text-sm">{step}</span>
              <span className="tt-label">pending · 0</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Main: lead table + detail panel */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="tt-card p-5 lg:col-span-2">
          <div className="tt-label mb-3">Leads</div>
          <div className="grid place-items-center rounded-md border border-dashed border-line py-16 text-center">
            <p className="text-sm text-muted">
              No leads yet.
              <br />
              <span className="text-xs">
                Next step: add leads manually or import a CSV (Phase 2).
              </span>
            </p>
          </div>
        </div>
        <div className="tt-card p-5">
          <div className="tt-label mb-3">Selected lead</div>
          <p className="text-sm text-muted">
            Select a lead to see contact info, audit summary, score breakdown,
            offer match, and drafts.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "lime";
}) {
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

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="tt-label">{label}</span>
      <input
        placeholder={placeholder}
        disabled
        className="mt-1 w-full rounded-md border border-line bg-ink-2 px-2.5 py-2 text-sm outline-none placeholder:text-muted/50"
      />
    </label>
  );
}
