"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireProfile } from "@/lib/guard";
import { createCampaign } from "@/lib/campaigns";
import { createLead, importLeads, leadFromRecord, type LeadInput } from "@/lib/leads";
import { parseCsvRecords } from "@/lib/csv";
import { isLeadStatus } from "@/lib/leadStatus";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function createCampaignAction(slug: string, fd: FormData) {
  const { profile } = await requireProfile(slug, "manage_campaigns");
  const name = str(fd, "name");
  if (!name) return { error: "Campaign name is required." };
  const c = await createCampaign(profile.id, {
    name,
    niche: str(fd, "niche"),
    city: str(fd, "city"),
    state: str(fd, "state"),
    sourceType: str(fd, "sourceType"),
    offerLane: str(fd, "offerLane"),
    maxLeads: Number(str(fd, "maxLeads")) || 50,
  });
  revalidatePath(`/p/${slug}`);
  return { ok: true, campaignId: c.id };
}

export async function addLeadAction(slug: string, campaignId: string | null, fd: FormData) {
  const { profile } = await requireProfile(slug, "edit_leads");
  const businessName = str(fd, "businessName");
  if (!businessName) return { error: "Business name is required." };
  const input: LeadInput = {
    businessName,
    category: str(fd, "category"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    state: str(fd, "state"),
    phone: str(fd, "phone"),
    website: str(fd, "website"),
    email: str(fd, "email"),
    offerAngle: str(fd, "offerAngle"),
    source: "manual",
  };
  const { created } = await createLead(profile.id, campaignId, input);
  revalidatePath(`/p/${slug}`);
  return created ? { ok: true } : { error: "Skipped: duplicate of an existing lead." };
}

export async function importCsvAction(slug: string, campaignId: string | null, fd: FormData) {
  const { profile } = await requireProfile(slug, "edit_leads");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  const text = await file.text();
  const inputs = parseCsvRecords(text)
    .map(leadFromRecord)
    .filter((l): l is LeadInput => l !== null);
  if (inputs.length === 0) {
    return { error: "No rows with a recognizable business name/column found." };
  }
  const { imported, duplicates } = await importLeads(profile.id, campaignId, inputs);
  revalidatePath(`/p/${slug}`);
  return { ok: true, imported, duplicates };
}

export async function updateLeadStatusAction(slug: string, leadId: string, status: string) {
  const { profile } = await requireProfile(slug, "mark_status");
  if (!isLeadStatus(status)) return { error: "Unknown status." };
  // Scope the update to the profile so a leaked id can't touch other profiles.
  await prisma.lead.updateMany({
    where: { id: leadId, profileId: profile.id },
    data: { status },
  });
  revalidatePath(`/p/${slug}`);
  return { ok: true };
}
