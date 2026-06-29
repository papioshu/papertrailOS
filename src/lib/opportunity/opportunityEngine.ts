// Opportunity Engine — deterministic offer-fit + partnered-offer detection.
// One prospect can produce several opportunities across profiles, plus
// partnered opportunities where two profiles share a target. Pure logic, no
// DB, no model calls — every opportunity carries its reasoning.
import type { ProfileSlug } from "@/lib/profiles";

export type ProspectSignal = {
  // Free text we match against (category, business type, name fragments).
  category?: string | null;
  type?: string | null;
  website?: string | null;
  // Audit hints when available — sharpen Zathena's angle and fit.
  websiteScore?: number | null;
  conversionScore?: number | null;
};

export type ProfileOpportunity = {
  profiles: ProfileSlug[]; // 1 entry = single-profile, 2 = partnered
  isPartnered: boolean;
  offerType: string;
  serviceLane: string;
  angle: string;
  reasoning: string;
  fitScore: number; // 0–100
};

const has = (re: RegExp, hay: string) => re.test(hay);

// Target signatures per profile (from the profile demographics in the brief).
const TARGET: Record<ProfileSlug, RegExp> = {
  zathena:
    /(barber|tattoo|smoke shop|hvac|roof|restaurant|cafe|diner|lounge|gym|salon|spa|venue|local brand|small business|shop\b|booking)/i,
  papershoots:
    /(artist|dj\b|musician|band|promoter|venue|concert|pool party|showcase|pop.?up|festival|event|brand|content|recap|car meet|club\b)/i,
  caedis:
    /(outdoor|venue|car meet|festival|real estate|realtor|construction|site|event|aerial|drone|flyover|property)/i,
  bombsquad:
    /(artist|venue|pop.?up|streetwear|drop\b|creative market|promoter|event|brand|community|showcase|culture|collab)/i,
};

// Partnered combos: both profiles share these targets; offer is framed as one
// combined package, not two separate pitches.
const PARTNERS: Array<{
  profiles: [ProfileSlug, ProfileSlug];
  target: RegExp;
  offerType: string;
  serviceLane: string;
  angle: string;
}> = [
  {
    profiles: ["papershoots", "caedis"],
    target: /(venue|outdoor|car meet|festival|pool party|event organizer|promoter|event\b)/i,
    offerType: "Ground + aerial coverage",
    serviceLane: "Event media",
    angle: "Recap video and social clips on the ground plus drone establishing shots — one combined coverage package.",
  },
  {
    profiles: ["bombsquad", "papershoots"],
    target: /(artist|showcase|promoter|pop.?up|creative market|streetwear|drop\b)/i,
    offerType: "Creative event coverage",
    serviceLane: "Culture content",
    angle: "Culture-first event coverage and artist media with rollout support across the drop.",
  },
  {
    profiles: ["zathena", "papershoots"],
    target: /(barber|tattoo|restaurant|cafe|gym|lounge|salon|spa|local brand|shop\b)/i,
    offerType: "Web refresh + fresh content",
    serviceLane: "Local presence",
    angle: "Website refresh and booking flow paired with photo/social clips and a Google profile cleanup.",
  },
  {
    profiles: ["bombsquad", "zathena"],
    target: /(event organizer|venue|creative brand|brand\b|campaign|community)/i,
    offerType: "Landing page + media rollout",
    serviceLane: "Campaign infrastructure",
    angle: "Event/landing page plus a creative media rollout — digital presence and content campaign together.",
  },
];

// Single-profile angle, refined by audit signal for Zathena.
function singleAngle(p: ProfileSlug, s: ProspectSignal): { offerType: string; serviceLane: string; angle: string } {
  switch (p) {
    case "zathena": {
      if (!s.website) return { offerType: "Digital presence package", serviceLane: "Web build", angle: "No website found — start from a complete build with booking." };
      if ((s.conversionScore ?? 100) < 50) return { offerType: "Booking system", serviceLane: "Conversion", angle: "Site lacks a clear booking/contact path." };
      if ((s.websiteScore ?? 100) < 60) return { offerType: "Website refresh", serviceLane: "Web refresh", angle: "Existing site scores low; a refresh lifts conversion." };
      return { offerType: "SEO / Google Business cleanup", serviceLane: "Visibility", angle: "Site is decent; growth comes from visibility." };
    }
    case "papershoots":
      return { offerType: "Content package", serviceLane: "Creative content", angle: "Event recap, short-form clips, and promo content." };
    case "caedis":
      return { offerType: "Aerial coverage", serviceLane: "Aerial", angle: "Drone event footage and aerial venue/site promo." };
    case "bombsquad":
      return { offerType: "Creative campaign", serviceLane: "Brand media", angle: "Creative event coverage and brand collaboration content." };
  }
}

/**
 * All opportunities for a prospect, ranked by fit. Includes single-profile
 * opportunities and partnered ones; an empty array means no profile fits.
 */
export function matchOpportunities(s: ProspectSignal): ProfileOpportunity[] {
  const hay = `${s.category ?? ""} ${s.type ?? ""}`.toLowerCase();
  if (!hay.trim()) return [];
  const out: ProfileOpportunity[] = [];

  // Single-profile fits.
  for (const p of Object.keys(TARGET) as ProfileSlug[]) {
    if (!has(TARGET[p], hay)) continue;
    const a = singleAngle(p, s);
    let fit = 60;
    if (p === "zathena" && ((s.conversionScore ?? 100) < 50 || !s.website)) fit += 15; // clear web gap
    out.push({
      profiles: [p],
      isPartnered: false,
      offerType: a.offerType,
      serviceLane: a.serviceLane,
      angle: a.angle,
      reasoning: `Matches ${p} target profile.`,
      fitScore: Math.min(100, fit),
    });
  }

  // Partnered fits — only when the shared target signature hits.
  for (const combo of PARTNERS) {
    if (!has(combo.target, hay)) continue;
    out.push({
      profiles: combo.profiles,
      isPartnered: true,
      offerType: combo.offerType,
      serviceLane: combo.serviceLane,
      angle: combo.angle,
      reasoning: `Shared target for ${combo.profiles[0]} + ${combo.profiles[1]} — partnered offer.`,
      fitScore: 80, // partnered fit ranks above singles when applicable
    });
  }

  return out.sort((a, b) => b.fitScore - a.fitScore);
}
