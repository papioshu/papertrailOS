import { prisma } from "@/lib/prisma";
import { auditWebsite, type AuditScores } from "./auditEngine";
import { gradeLead } from "@/lib/grade/gradingEngine";
import { matchOffer } from "@/lib/offer/offerMatch";
import type { ProfileSlug } from "@/lib/profiles";

export type AuditRunSummary = {
  audited: number;
  unreachable: number;
  graded: number;
};

/**
 * Audit (where a website exists), grade, and offer-match every lead in scope,
 * persisting a WebsiteAudit row and updating each lead.
 * ponytail: runs synchronously in sequence — fine for the per-campaign lead
 * counts here. Move to a queued JobRunner if a single run ever spans hundreds.
 */
export async function runAuditAndGrade(
  profileId: string,
  slug: ProfileSlug,
  campaignId?: string | null,
): Promise<AuditRunSummary> {
  const leads = await prisma.lead.findMany({
    where: { profileId, ...(campaignId ? { campaignId } : {}) },
  });

  let audited = 0;
  let unreachable = 0;
  let graded = 0;

  for (const lead of leads) {
    let scores: AuditScores | null = null;

    if (lead.website) {
      const result = await auditWebsite(lead.website);
      scores = result.ok ? result : null;
      const offer = matchOffer(slug, lead, scores);
      await prisma.websiteAudit.create({
        data: {
          profileId,
          leadId: lead.id,
          reachable: result.ok,
          websiteScore: result.websiteScore,
          mobileScore: result.mobileScore,
          seoScore: result.seoScore,
          conversionScore: result.conversionScore,
          trustScore: result.trustScore,
          contentScore: result.contentScore,
          summary: result.summary,
          findingsJson: result.findings,
          recommendedOfferAngle: offer.offer,
        },
      });
      result.ok ? audited++ : unreachable++;
    }

    const grade = gradeLead(lead, scores);
    const offer = matchOffer(slug, lead, scores);
    await prisma.lead.update({
      where: { id: lead.id },
      data: { leadScore: grade.score, offerAngle: offer.offer, status: "Graded" },
    });
    graded++;
  }

  await prisma.activityLog.create({
    data: { profileId, action: "audit_grade", detail: { audited, unreachable, graded } },
  });

  return { audited, unreachable, graded };
}
