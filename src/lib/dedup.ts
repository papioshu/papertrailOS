// Fuzzy lead deduplication. Two leads collide if they share any normalized
// key: website host, email, phone (last 10 digits), or name+address.

export type DedupFields = {
  businessName?: string | null;
  address?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
};

function normHost(url?: string | null): string | null {
  if (!url) return null;
  const h = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
  return h || null;
}

function normPhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

function normText(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Namespaced collision keys for a lead. Empty if nothing identifying. */
export function dedupKeys(lead: DedupFields): string[] {
  const keys: string[] = [];
  const host = normHost(lead.website);
  if (host) keys.push(`web:${host}`);
  const email = lead.email?.trim().toLowerCase();
  if (email) keys.push(`email:${email}`);
  const phone = normPhone(lead.phone);
  if (phone) keys.push(`phone:${phone}`);
  const name = normText(lead.businessName);
  const addr = normText(lead.address);
  if (name && addr) keys.push(`na:${name}|${addr}`);
  return keys;
}

/**
 * Split a batch into new leads vs duplicates, seeding from existing keys.
 * Mutates nothing; returns the unique subset and how many were dropped.
 */
export function dedupeBatch<T extends DedupFields>(
  batch: T[],
  existingKeys: Iterable<string> = [],
): { unique: T[]; duplicates: number } {
  const seen = new Set(existingKeys);
  const unique: T[] = [];
  let duplicates = 0;
  for (const lead of batch) {
    const keys = dedupKeys(lead);
    if (keys.length > 0 && keys.some((k) => seen.has(k))) {
      duplicates++;
      continue;
    }
    keys.forEach((k) => seen.add(k));
    unique.push(lead);
  }
  return { unique, duplicates };
}
