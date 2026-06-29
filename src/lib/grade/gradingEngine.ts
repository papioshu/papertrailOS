// Deterministic lead grading. Explainable rules only — every point change
// carries a reason. A model provider may refine copy later; scoring stays here.
import type { AuditScores } from "@/lib/audit/auditEngine";

export type GradeInput = {
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  reviewCount?: number | null;
  city?: string | null;
  category?: string | null;
  // Fit for the selected profile, from the offer/opportunity match.
  profileFit?: "high" | "low" | null;
  // Visible event/content need (event-type prospect or weak content signal).
  eventNeed?: boolean | null;
  // A partnered opportunity was detected for this prospect.
  partnered?: boolean | null;
  // On the suppression / do-not-contact list — forces Not Fit.
  suppressed?: boolean | null;
};

export type GradeBand =
  | "Not Fit"
  | "Needs Review"
  | "Qualified"
  | "High Fit"
  | "Hot Lead";

// One scoring axis: a 0–100 value with its one-line explanation.
export type Axis = { score: number; reason: string };

export type GradeResult = {
  score: number; // headline lead score
  band: GradeBand;
  reasons: string[];
  // Multi-axis breakdown (each explained).
  fitScore: Axis;
  urgencyScore: Axis;
  budgetLikelihoodScore: Axis;
  contactabilityScore: Axis;
  websiteScore: Axis;
  contentNeedScore: Axis;
  eventFitScore: Axis;
  partneredOpportunityScore: Axis;
};

const DFW = /(fort worth|dallas|arlington|denton|plano|irving|dfw|grand prairie|mesquite|frisco|mckinney)/i;
const FRANCHISE = /(mcdonald|starbucks|subway|walmart|target|franchise|chick.?fil|domino|burger king|7.?eleven|cvs|walgreens|dunkin|taco bell)/i;
const ACTIVE_CAT = /(barber|tattoo|restaurant|cafe|gym|salon|spa|lounge|venue|shop|artist|promoter|event|brand)/i;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function bandFor(score: number): GradeBand {
  if (score >= 90) return "Hot Lead";
  if (score >= 75) return "High Fit";
  if (score >= 60) return "Qualified";
  if (score >= 40) return "Needs Review";
  return "Not Fit";
}

export function gradeLead(lead: GradeInput, audit?: AuditScores | null): GradeResult {
  const cat = lead.category ?? "";
  const hasContact = !!(lead.email || lead.phone);
  const social = !!(lead.instagram || lead.facebook || lead.tiktok);
  const franchise = FRANCHISE.test(cat) || FRANCHISE.test(lead.website ?? "");
  const weakCta = !!audit && audit.conversionScore > 0 && audit.conversionScore < 60;
  const noBooking = !!audit && audit.conversionScore < 40;
  const strongSite = !!audit && audit.websiteScore >= 85;
  const local = !!lead.city && DFW.test(lead.city);

  // --- Headline lead score: the spec's rule rubric. ---
  let score = 45;
  const reasons: string[] = ["Base score 45"];
  const apply = (delta: number, why: string) => {
    score += delta;
    reasons.push(`${delta >= 0 ? "+" : ""}${delta} ${why}`);
  };

  if (lead.website && weakCta) apply(20, "website exists but weak CTA");
  else if (!lead.website) apply(15, "no website — clear opportunity");
  if ((lead.reviewCount ?? 0) >= 50) apply(15, "high review count");
  if (ACTIVE_CAT.test(cat)) apply(10, "active business category");
  if (social && audit && audit.contentScore < 60) apply(10, "social presence but weak content");
  if (noBooking) apply(15, "no booking/contact system");
  if (local) apply(10, "local to DFW");
  if (lead.eventNeed) apply(10, "visible event/content need");
  if (lead.profileFit === "high") apply(10, "high-fit category for profile");

  if (franchise) apply(-20, "franchise/corporate");
  if (!hasContact) apply(-15, "no public contact");
  if (strongSite) apply(-10, "already has a strong agency-level site");
  if (lead.profileFit === "low") apply(-10, "poor fit for profile");
  if (lead.suppressed) apply(-20, "suppressed / do-not-contact");

  score = lead.suppressed ? Math.min(score, 39) : clamp(score);

  // --- Axes (each explained). ---
  const fitScore: Axis =
    lead.profileFit === "high"
      ? { score: 90, reason: "High-fit category for the selected profile." }
      : lead.profileFit === "low"
        ? { score: 30, reason: "Weak fit for the selected profile." }
        : { score: 60, reason: "Neutral fit — no strong profile signal." };

  const urgencyScore: Axis = noBooking
    ? { score: 85, reason: "No booking/contact path — immediate need." }
    : weakCta
      ? { score: 70, reason: "Weak CTA — conversion is leaking." }
      : { score: 45, reason: "No urgent gap detected." };

  const budgetLikelihoodScore: Axis = franchise
    ? { score: 25, reason: "Franchise/corporate — budget routed elsewhere." }
    : (lead.reviewCount ?? 0) >= 50
      ? { score: 75, reason: "Established (50+ reviews) — likely has budget." }
      : { score: 50, reason: "Unknown budget — typical small business." };

  const contactabilityScore: Axis = hasContact
    ? { score: lead.email ? 90 : 70, reason: lead.email ? "Public email available." : "Phone available; no email." }
    : { score: 20, reason: "No public contact found." };

  const websiteScore: Axis = audit
    ? { score: audit.websiteScore, reason: `Audit website score ${audit.websiteScore}/100.` }
    : !lead.website
      ? { score: 0, reason: "No website found." }
      : { score: 50, reason: "Website not yet audited." };

  const contentNeedScore: Axis =
    audit && audit.contentScore < 60
      ? { score: 80, reason: "Thin photos/video — content need." }
      : social && !audit
        ? { score: 60, reason: "Active social; content quality unknown." }
        : { score: 40, reason: "No clear content gap." };

  const eventFitScore: Axis = /(event|venue|festival|showcase|pop.?up|car meet|pool party|concert|promoter)/i.test(cat)
    ? { score: 85, reason: "Event/venue prospect — strong event fit." }
    : { score: 35, reason: "Not an event-shaped prospect." };

  const partneredOpportunityScore: Axis = lead.partnered
    ? { score: 80, reason: "A partnered offer applies to this prospect." }
    : { score: 40, reason: "No partnered offer detected." };

  return {
    score,
    band: bandFor(score),
    reasons,
    fitScore,
    urgencyScore,
    budgetLikelihoodScore,
    contactabilityScore,
    websiteScore,
    contentNeedScore,
    eventFitScore,
    partneredOpportunityScore,
  };
}
