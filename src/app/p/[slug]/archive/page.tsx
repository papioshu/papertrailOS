import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileRole } from "@/lib/access";
import { getProfileBrand } from "@/lib/profiles";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORIES = [
  { key: "leads", label: "Leads", note: "New and in-progress leads." },
  { key: "prospects", label: "Prospects", note: "Qualified and engaged." },
  { key: "customers", label: "Customers", note: "Converted accounts." },
  { key: "closed", label: "Closed", note: "Closed, not a fit, or archived." },
  { key: "dnc", label: "Do Not Contact", note: "Suppressed / opted out." },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

function categoryOf(status: string): Category {
  if (status === "Customer") return "customers";
  if (status === "Do Not Contact" || status === "Opted Out") return "dnc";
  if (["Closed", "Archived", "Not Interested", "Not Fit"].includes(status)) return "closed";
  if (
    ["Qualified", "Needs Review", "Draft Ready", "Approved", "Queued", "Contacted",
      "Follow Up 1", "Follow Up 2", "Replied", "Interested"].includes(status)
  ) {
    return "prospects";
  }
  return "leads";
}

export default async function ArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { slug } = await params;
  const { cat } = await searchParams;
  const brand = getProfileBrand(slug);
  const role = await getProfileRole(slug);
  if (!brand) notFound();
  if (!role) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="tt-card p-6">
          <div className="tt-label text-gold">No access</div>
          <p className="mt-2 text-sm text-muted">
            <Link href="/select" className="text-violet underline">Back to selector</Link>.
          </p>
        </div>
      </main>
    );
  }

  const profile = await prisma.profile.findUnique({ where: { slug } });
  if (!profile) notFound();

  // ponytail: loads all profile leads and partitions in memory; paginate per
  // category if a profile ever holds tens of thousands of records.
  const leads = await prisma.lead.findMany({
    where: { profileId: profile.id },
    orderBy: { updatedAt: "desc" },
  });

  const counts: Record<Category, number> = { leads: 0, prospects: 0, customers: 0, closed: 0, dnc: 0 };
  for (const l of leads) counts[categoryOf(l.status)]++;

  const active: Category = (CATEGORIES.find((c) => c.key === cat)?.key ?? "leads") as Category;
  const records = leads.filter((l) => categoryOf(l.status) === active);
  const meta = CATEGORIES.find((c) => c.key === active)!;
  const glow = { ["--glow" as string]: brand.accent };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="tt-card tt-glow mb-6 flex flex-wrap items-center justify-between gap-3 p-5" style={glow}>
        <div>
          <div className="tt-label" style={{ color: brand.accent }}>Archive Trail · {brand.name}</div>
          <h1 className="tt-display text-xl">Papertrail Records</h1>
        </div>
        <Link href={`/p/${slug}`} className="tt-label rounded-md border border-line px-3 py-1.5 hover:border-violet">
          ← Workflow
        </Link>
      </header>

      {/* Folder tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const on = c.key === active;
          return (
            <Link
              key={c.key}
              href={`/p/${slug}/archive?cat=${c.key}`}
              className={`rounded-t-md border px-3 py-2 text-sm transition ${
                on ? "border-violet bg-violet/15 text-fg" : "border-line text-muted hover:border-violet"
              }`}
            >
              <span className="tt-display">{c.label}</span>
              <span className="ml-2 tt-label">{counts[c.key]}</span>
            </Link>
          );
        })}
      </div>

      <p className="mb-4 text-xs text-muted">{meta.note}</p>

      {records.length === 0 ? (
        <EmptyState
          eyebrow="Archive Trail"
          title="Nothing in this folder"
          hint="Records move here as leads progress through the workflow."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((l) => (
            <RecordCard
              key={l.id}
              code={`PT-${l.id.slice(-8).toUpperCase()}`}
              name={l.businessName}
              status={l.status}
              category={l.category}
              city={l.city}
              email={l.email}
              dnc={active === "dnc"}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function RecordCard({
  code, name, status, category, city, email, dnc,
}: {
  code: string;
  name: string;
  status: string;
  category: string | null;
  city: string | null;
  email: string | null;
  dnc: boolean;
}) {
  return (
    <div className="tt-paper relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[0.7rem] tracking-widest text-paper-ink/60">{code}</div>
          <div className="mt-1 font-semibold leading-tight">{name}</div>
        </div>
        {dnc && (
          <span className="-rotate-6 rounded border-2 border-[#9b2c3a]/70 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-[#9b2c3a]/80">
            Do Not Contact
          </span>
        )}
      </div>
      <dl className="mt-3 space-y-0.5 text-[0.72rem] text-paper-ink/75">
        <div>{category ?? "—"}{city ? ` · ${city}` : ""}</div>
        {email && <div className="font-mono">{email}</div>}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-[#b9ad9a] pt-2 text-[0.6rem] uppercase tracking-widest text-paper-ink/60">
        <span>{status}</span>
        <span className="flex h-3 items-end gap-[1px]" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="block w-px bg-paper-ink/50" style={{ height: ((code.charCodeAt(i % code.length) + i) % 3) + 2 }} />
          ))}
        </span>
      </div>
    </div>
  );
}
