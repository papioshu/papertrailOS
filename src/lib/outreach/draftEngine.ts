import { prisma } from "@/lib/prisma";
import { getModelProvider, TemplateProvider, type DraftContext } from "@/lib/providers/modelProvider";
import { checkCompliance, type DraftChannel } from "./complianceChecker";
import { matchOffer } from "@/lib/offer/offerMatch";
import type { AuditScores, Finding } from "@/lib/audit/auditEngine";
import type { ProfileSlug } from "@/lib/profiles";

const CHANNELS: DraftChannel[] = ["email", "dm", "call", "followup1", "followup2"];

/**
 * Compose all outreach channels for a lead from real research/offer context,
 * run the compliance check, and upsert one draft per channel. The hosted
 * provider (if a key is set) generates copy; any failure falls back to the
 * deterministic template composer so this never hard-fails.
 */
export async function composeDraftsForLead(
  profileId: string,
  slug: ProfileSlug,
  leadId: string,
): Promise<{ composed: number; provider: string }> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, profileId },
    include: {
      audits: { orderBy: { createdAt: "desc" }, take: 1 },
      profile: { include: { identity: true } },
    },
  });
  if (!lead) throw new Error("Lead not found");

  const audit = lead.audits[0] ?? null;
  const scores: AuditScores | null =
    audit && audit.reachable
      ? {
          websiteScore: audit.websiteScore,
          mobileScore: audit.mobileScore,
          seoScore: audit.seoScore,
          conversionScore: audit.conversionScore,
          trustScore: audit.trustScore,
          contentScore: audit.contentScore,
        }
      : null;
  const offer = matchOffer(slug, lead, scores);

  const topFindings = audit
    ? ((audit.findingsJson as Finding[] | null) ?? [])
        .filter((f) => f.status !== "pass")
        .map((f) => f.label)
        .slice(0, 3)
    : [];

  const identity = lead.profile.identity;
  const ctx: DraftContext = {
    profileName: lead.profile.name,
    offer: offer.offer,
    rationale: offer.rationale,
    lead: {
      businessName: lead.businessName,
      category: lead.category,
      city: lead.city,
      offerAngle: lead.offerAngle,
    },
    audit: audit ? { summary: audit.summary, topFindings } : null,
    identity: {
      fromName: identity?.fromName,
      legalName: identity?.legalName,
      postalAddress: identity?.postalAddress,
      optOutText: identity?.optOutText,
    },
  };

  const provider = getModelProvider();
  const fallback = new TemplateProvider();
  let usedProvider = provider.name;

  for (const channel of CHANNELS) {
    let composed;
    try {
      composed = await provider.compose(ctx, channel);
    } catch {
      composed = await fallback.compose(ctx, channel);
      usedProvider = `${provider.name}->template`;
    }

    const compliance = checkCompliance({
      channel,
      subject: composed.subject,
      body: composed.body,
      identity: ctx.identity,
      hasPriorContact: false,
    });

    await prisma.outreachDraft.upsert({
      where: { leadId_channel: { leadId, channel } },
      update: {
        subject: composed.subject ?? null,
        body: composed.body,
        providerUsed: usedProvider,
        complianceStatus: compliance.status,
        complianceRisk: compliance.risk,
        complianceJson: compliance.reasons,
        approved: false,
        approvedBy: null,
        approvedAt: null,
      },
      create: {
        profileId,
        leadId,
        channel,
        subject: composed.subject ?? null,
        body: composed.body,
        providerUsed: usedProvider,
        complianceStatus: compliance.status,
        complianceRisk: compliance.risk,
        complianceJson: compliance.reasons,
      },
    });
  }

  await prisma.activityLog.create({
    data: { profileId, action: "compose_drafts", detail: { leadId, provider: usedProvider } },
  });

  return { composed: CHANNELS.length, provider: usedProvider };
}
