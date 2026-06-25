"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AutoAnimate } from "@/components/AutoAnimate";

type Result = { ok?: boolean; error?: string } | null;
type Campaign = { id: string; name: string };

const FIELD =
  "rounded-md border border-line bg-ink-2 px-2.5 py-2 text-sm outline-none focus:border-violet";

export function CampaignBar({
  slug,
  campaigns,
  activeId,
  createCampaign,
}: {
  slug: string;
  campaigns: Campaign[];
  activeId: string | null;
  createCampaign: (fd: FormData) => Promise<Result>;
}) {
  const [state, action, pending] = useActionState(
    async (_p: Result, fd: FormData) => createCampaign(fd),
    null,
  );

  return (
    <div className="space-y-3">
      <AutoAnimate className="flex flex-wrap items-center gap-2">
        <Chip href={`/p/${slug}`} active={activeId === null}>
          All leads
        </Chip>
        {campaigns.map((c) => (
          <Chip key={c.id} href={`/p/${slug}?c=${c.id}`} active={activeId === c.id}>
            {c.name}
          </Chip>
        ))}
      </AutoAnimate>

      <details className="tt-card p-4">
        <summary className="tt-label cursor-pointer select-none">New campaign</summary>
        <form action={action} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input name="name" required placeholder="Name *" className={`${FIELD} col-span-2 sm:col-span-3`} />
          <input name="niche" placeholder="Niche" className={FIELD} />
          <input name="city" placeholder="City" className={FIELD} />
          <input name="state" placeholder="State" className={FIELD} />
          <input name="offerLane" placeholder="Offer lane" className={FIELD} />
          <input name="maxLeads" type="number" placeholder="Max leads (50)" className={FIELD} />
          <button
            disabled={pending}
            className="rounded-md bg-violet px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </form>
        {state?.error && <p className="mt-2 text-xs text-signal">{state.error}</p>}
        {state?.ok && <p className="mt-2 text-xs text-lime">Campaign created.</p>}
      </details>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        active
          ? "border-violet bg-violet/20 text-fg"
          : "border-line text-muted hover:border-violet"
      }`}
    >
      {children}
    </Link>
  );
}
