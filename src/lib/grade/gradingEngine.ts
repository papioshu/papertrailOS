// Deterministic lead grading. Explainable rules only — every point change
// carries a reason. A model provider may refine copy later; scoring stays here.
import type { AuditScores } from "@/lib/audit/auditEngine";

export type GradeInput = {
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  reviewCount?: number | null;
  city?: string | null;
};

export type GradeBand =
  | "Not Fit"
  | "Needs Review"
  | "Qualified"
  | "High Fit"
  | "Hot Lead";

export type GradeResult = {
  score: number;
  band: GradeBand;
  reasons: string[];
};

const DFW = /(fort worth|dallas|arlington|denton|plano|irving|dfw|grand prairie|mesquite|frisco|mckinney)/i;

export function bandFor(score: number): GradeBand {
  if (score >= 90) return "Hot Lead";
  if (score >= 75) return "High Fit";
  if (score >= 60) return "Qualified";
  if (score >= 40) return "Needs Review";
  return "Not Fit";
}

export function gradeLead(lead: GradeInput, audit?: AuditScores | null): GradeResult {
  let score = 45;
  const reasons: string[] = ["Base score 45"];
  const apply = (delta: number, why: string) => {
    score += delta;
    reasons.push(`${delta >= 0 ? "+" : ""}${delta} ${why}`);
  };

  if (lead.website && audit && audit.conversionScore < 60) {
    apply(20, "has a website but weak conversion/CTA");
  } else if (!lead.website) {
    apply(15, "no website — clear opportunity");
  }
  if (audit && audit.websiteScore > 0 && audit.websiteScore < 50) {
    apply(10, "poor overall website score");
  }
  if ((lead.reviewCount ?? 0) >= 50) apply(15, "established (50+ reviews)");
  if (lead.instagram) apply(10, "active on Instagram");
  if (audit && audit.conversionScore < 40) apply(15, "no booking/contact path");
  if (lead.city && DFW.test(lead.city)) apply(10, "local to DFW");

  if (!lead.email && !lead.phone) apply(-15, "no public contact found");
  if (audit && audit.websiteScore >= 85) apply(-10, "already has a strong site");

  score = Math.max(0, Math.min(100, score));
  return { score, band: bandFor(score), reasons };
}
