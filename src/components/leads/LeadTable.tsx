"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AutoAnimate } from "@/components/AutoAnimate";
import { LEAD_STATUSES } from "@/lib/leadStatus";

export type LeadRow = {
  id: string;
  businessName: string;
  category: string | null;
  city: string | null;
  leadScore: number | null;
  offerAngle: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  website: string | null;
};

export function LeadTable({
  leads,
  updateStatus,
  slug,
  campaignId,
  selectedId,
}: {
  leads: LeadRow[];
  updateStatus: (leadId: string, status: string) => Promise<unknown>;
  slug: string;
  campaignId: string | null;
  selectedId: string | null;
}) {
  const [pending, start] = useTransition();
  const hrefFor = (id: string) =>
    `/p/${slug}?lead=${id}${campaignId ? `&c=${campaignId}` : ""}`;

  if (leads.length === 0) {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-line py-16 text-center">
        <p className="text-sm text-muted">
          No leads yet.
          <br />
          <span className="text-xs">
            Add one manually or import a CSV above.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left">
            {["Business", "Category", "City", "Score", "Offer Angle", "Status", "Contact"].map(
              (h) => (
                <th key={h} className="tt-label border-b border-line px-2 py-2">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <AutoAnimate as="tbody" className={pending ? "opacity-60 transition" : "transition"}>
          {leads.map((l) => (
            <tr
              key={l.id}
              className={`border-b border-line/60 align-top ${
                l.id === selectedId ? "bg-violet/10" : ""
              }`}
            >
              <td className="px-2 py-2 font-medium">
                <Link href={hrefFor(l.id)} scroll={false} className="hover:text-violet-soft hover:underline">
                  {l.businessName}
                </Link>
              </td>
              <td className="px-2 py-2 text-muted">{l.category ?? "—"}</td>
              <td className="px-2 py-2 text-muted">{l.city ?? "—"}</td>
              <td className="px-2 py-2">{l.leadScore ?? "—"}</td>
              <td className="px-2 py-2 text-muted">{l.offerAngle ?? "—"}</td>
              <td className="px-2 py-2">
                <select
                  defaultValue={l.status}
                  disabled={pending}
                  onChange={(e) => start(() => updateStatus(l.id, e.target.value).then(() => {}))}
                  className="rounded border border-line bg-ink-2 px-1.5 py-1 text-xs outline-none focus:border-violet"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2 text-xs text-muted">
                {l.email && <div>{l.email}</div>}
                {l.phone && <div>{l.phone}</div>}
                {l.website && (
                  <a
                    href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-soft underline"
                  >
                    site
                  </a>
                )}
                {!l.email && !l.phone && !l.website && "—"}
              </td>
            </tr>
          ))}
        </AutoAnimate>
      </table>
    </div>
  );
}
