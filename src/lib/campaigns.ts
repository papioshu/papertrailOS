import { prisma } from "@/lib/prisma";

export function listCampaigns(profileId: string) {
  return prisma.campaign.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });
}

export function createCampaign(
  profileId: string,
  data: {
    name: string;
    niche?: string | null;
    city?: string | null;
    state?: string | null;
    sourceType?: string | null;
    offerLane?: string | null;
    maxLeads?: number | null;
  },
) {
  return prisma.campaign.create({
    data: {
      profileId,
      name: data.name,
      niche: data.niche || null,
      city: data.city || null,
      state: data.state || null,
      sourceType: data.sourceType || "manual",
      offerLane: data.offerLane || null,
      maxLeads: data.maxLeads ?? 50,
    },
  });
}
