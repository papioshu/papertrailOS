// Deterministic offer matching per profile, driven by audit findings + lead
// signals. Returns the best-fit offer and a plain rationale.
import type { ProfileSlug } from "@/lib/profiles";
import type { AuditScores } from "@/lib/audit/auditEngine";

export type OfferMatch = { offer: string; rationale: string };

export type OfferInput = {
  website?: string | null;
  category?: string | null;
};

const EVENT_HINT =
  /(event|venue|festival|show|party|club|lounge|promoter|dj|artist|gallery|pop.?up|market|drop)/i;

export function matchOffer(
  profile: ProfileSlug,
  lead: OfferInput,
  audit?: AuditScores | null,
): OfferMatch {
  const noSite = !lead.website;
  const weakSite = !!audit && audit.websiteScore > 0 && audit.websiteScore < 60;
  const noBooking = !!audit && audit.conversionScore < 50;
  const isEvent = EVENT_HINT.test(lead.category ?? "");

  switch (profile) {
    case "zathena":
      if (noSite) return { offer: "Full digital presence package", rationale: "No website found — start from a complete build." };
      if (noBooking) return { offer: "Booking system", rationale: "Site lacks a booking/contact path." };
      if (weakSite) return { offer: "Website refresh", rationale: "Existing site scores low; a refresh lifts conversion." };
      return { offer: "SEO / Google Business cleanup", rationale: "Site is decent; growth comes from visibility." };

    case "papershoots":
      return isEvent
        ? { offer: "Event recap package", rationale: "Event-type lead — recap photo/video fits." }
        : { offer: "Artist content package", rationale: "Creative lead — ongoing content fits." };

    case "caedis":
      return isEvent
        ? { offer: "Drone event footage", rationale: "Event venue — aerial coverage adds scale." }
        : { offer: "Venue aerial package", rationale: "Location-based lead suits aerial promo." };

    case "bombsquad":
      if (isEvent) return { offer: "Creative event coverage", rationale: "Event lead — full media coverage fits." };
      if (noSite || weakSite) return { offer: "Cross-profile package (web + media)", rationale: "Weak web presence + creative need — bundle web and media." };
      return { offer: "Brand collaboration", rationale: "Broad creative fit for a collab." };
  }
}
