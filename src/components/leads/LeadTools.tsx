"use client";

import { useActionState } from "react";

type Result =
  | { ok?: boolean; error?: string; imported?: number; duplicates?: number }
  | null;

const FIELD =
  "rounded-md border border-line bg-ink-2 px-2.5 py-2 text-sm outline-none focus:border-violet";

export function LeadTools({
  slug,
  campaignId,
  addLead,
  importCsv,
}: {
  slug: string;
  campaignId: string | null;
  addLead: (fd: FormData) => Promise<Result>;
  importCsv: (fd: FormData) => Promise<Result>;
}) {
  const [addState, addAction, addPending] = useActionState(
    async (_p: Result, fd: FormData) => addLead(fd),
    null,
  );
  const [impState, impAction, impPending] = useActionState(
    async (_p: Result, fd: FormData) => importCsv(fd),
    null,
  );

  const exportHref = `/p/${slug}/export${campaignId ? `?c=${campaignId}` : ""}`;

  return (
    <div className="flex flex-wrap items-start gap-3">
      {/* Add lead */}
      <details className="tt-card min-w-[18rem] flex-1 p-4">
        <summary className="tt-label cursor-pointer select-none">Add lead</summary>
        <form action={addAction} className="mt-3 grid grid-cols-2 gap-2">
          <input name="businessName" required placeholder="Business name *" className={`${FIELD} col-span-2`} />
          <input name="category" placeholder="Category" className={FIELD} />
          <input name="city" placeholder="City" className={FIELD} />
          <input name="phone" placeholder="Phone" className={FIELD} />
          <input name="email" placeholder="Email" className={FIELD} />
          <input name="website" placeholder="Website" className={`${FIELD} col-span-2`} />
          <input name="address" placeholder="Address" className={`${FIELD} col-span-2`} />
          <input name="offerAngle" placeholder="Offer angle" className={`${FIELD} col-span-2`} />
          <button
            disabled={addPending}
            className="col-span-2 rounded-md bg-violet px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {addPending ? "Saving…" : "Add lead"}
          </button>
        </form>
        {addState?.error && <p className="mt-2 text-xs text-signal">{addState.error}</p>}
        {addState?.ok && <p className="mt-2 text-xs text-lime">Lead added.</p>}
      </details>

      {/* CSV import */}
      <details className="tt-card min-w-[16rem] flex-1 p-4">
        <summary className="tt-label cursor-pointer select-none">Import CSV</summary>
        <form action={impAction} className="mt-3 space-y-2">
          <input type="file" name="file" accept=".csv,text/csv" required className="block w-full text-xs" />
          <p className="text-[0.7rem] text-muted">
            Header row required. Recognized columns: business name, category, city,
            phone, email, website, address, source.
          </p>
          <button
            disabled={impPending}
            className="rounded-md bg-violet px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {impPending ? "Importing…" : "Import"}
          </button>
        </form>
        {impState?.error && <p className="mt-2 text-xs text-signal">{impState.error}</p>}
        {impState?.ok && (
          <p className="mt-2 text-xs text-lime">
            Imported {impState.imported}; skipped {impState.duplicates} duplicate(s).
          </p>
        )}
      </details>

      {/* Export */}
      <a
        href={exportHref}
        className="tt-label self-start rounded-md border border-line px-3 py-2 hover:border-violet"
      >
        Export CSV
      </a>
    </div>
  );
}
