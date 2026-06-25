import { prisma } from "@/lib/prisma";
import { dedupKeys, dedupeBatch, type DedupFields } from "@/lib/dedup";

export type LeadInput = {
  businessName: string;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  offerAngle?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
};

// Accepted CSV header synonyms -> Lead field.
const HEADER_MAP: Record<string, keyof LeadInput> = {
  name: "businessName",
  business: "businessName",
  "business name": "businessName",
  businessname: "businessName",
  category: "category",
  type: "category",
  address: "address",
  city: "city",
  state: "state",
  phone: "phone",
  tel: "phone",
  website: "website",
  url: "website",
  site: "website",
  email: "email",
  instagram: "instagram",
  ig: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
  linkedin: "linkedin",
  source: "source",
  sourceurl: "sourceUrl",
  "source url": "sourceUrl",
};

export function leadFromRecord(rec: Record<string, string>): LeadInput | null {
  const out: Partial<LeadInput> = {};
  for (const [rawKey, value] of Object.entries(rec)) {
    const field = HEADER_MAP[rawKey.trim().toLowerCase()];
    if (field && value) out[field] = value;
  }
  if (!out.businessName) return null;
  return out as LeadInput;
}

async function existingKeys(profileId: string): Promise<string[]> {
  // ponytail: loads all profile leads' dedup fields into memory. Add a keyed
  // lookup table if a profile ever holds enough leads for this to hurt.
  const rows = await prisma.lead.findMany({
    where: { profileId },
    select: { businessName: true, address: true, website: true, email: true, phone: true },
  });
  return rows.flatMap((r) => dedupKeys(r as DedupFields));
}

export async function listLeads(profileId: string, campaignId?: string) {
  return prisma.lead.findMany({
    where: { profileId, ...(campaignId ? { campaignId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

/** Create one lead unless it duplicates an existing one. */
export async function createLead(
  profileId: string,
  campaignId: string | null,
  input: LeadInput,
): Promise<{ created: boolean }> {
  const keys = dedupKeys(input);
  if (keys.length > 0) {
    const existing = new Set(await existingKeys(profileId));
    if (keys.some((k) => existing.has(k))) return { created: false };
  }
  await prisma.lead.create({
    data: { ...input, profileId, campaignId, source: input.source ?? "manual" },
  });
  return { created: true };
}

/** Import a batch, deduping within the batch and against existing leads. */
export async function importLeads(
  profileId: string,
  campaignId: string | null,
  inputs: LeadInput[],
): Promise<{ imported: number; duplicates: number }> {
  const { unique, duplicates } = dedupeBatch(inputs, await existingKeys(profileId));
  if (unique.length > 0) {
    await prisma.lead.createMany({
      data: unique.map((i) => ({
        ...i,
        profileId,
        campaignId,
        source: i.source ?? "csv",
      })),
    });
  }
  return { imported: unique.length, duplicates };
}
