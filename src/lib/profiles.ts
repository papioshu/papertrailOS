// Static brand catalog for the four Papertrail OS profiles. The visual
// identity is fixed and known, so it lives in code; per-profile *data*
// (leads, campaigns, members) is DB-backed and access-controlled.

export type ProfileSlug = "zathena" | "papershoots" | "caedis" | "bombsquad";

export type ProfileBrand = {
  slug: ProfileSlug;
  name: string;
  short: string;
  tagline: string;
  accent: string; // primary glow
  asset: string; // square brand mark (/public path)
  card: string; // vertical access-card art (/public path)
  focus: string;
};

export const PROFILES: Record<ProfileSlug, ProfileBrand> = {
  zathena: {
    slug: "zathena",
    name: "Zathena Ventures",
    short: "ZV",
    tagline: "Venture Intelligence System",
    accent: "#c9a227",
    asset: "/brand/zathena.png",
    card: "/brand/card-zathena.png",
    focus: "Websites, booking systems, CRM, SEO, automation, local presence",
  },
  papershoots: {
    slug: "papershoots",
    name: "Papershoots",
    short: "PS",
    tagline: "Capture. Collect. Connect.",
    accent: "#b8a4e3",
    asset: "/brand/papershoots.png",
    card: "/brand/card-papershoots.png",
    focus: "Artist content, event recap, music videos, social clips, promo",
  },
  caedis: {
    slug: "caedis",
    name: "Caedis Aerials",
    short: "CA",
    tagline: "Aerial Intelligence System",
    accent: "#5b8def",
    asset: "/brand/caedis.png",
    card: "/brand/card-caedis.png",
    focus: "Drone footage, aerial event & real estate coverage, flyovers",
  },
  bombsquad: {
    slug: "bombsquad",
    name: "BMBSQD",
    short: "BS",
    tagline: "CREATE OR DIE",
    accent: "#aef044",
    asset: "/brand/bombsquad.png",
    card: "/brand/card-bombsquad.png",
    focus: "Events, media, art, music, pop-ups, streetwear, brand collabs",
  },
};

export const PROFILE_LIST = Object.values(PROFILES);

export function getProfileBrand(slug: string): ProfileBrand | undefined {
  return PROFILES[slug as ProfileSlug];
}
