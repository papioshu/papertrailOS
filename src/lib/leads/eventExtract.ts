import type { LeadInput } from "@/lib/leads";

// Pure event-lead extraction from a search result. No server deps so it stays
// unit-testable.

const DATE_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,?\s*\d{4})?\b/i;
const VENUE_RE = /\bat\s+([A-Z][\w'&.\- ]{2,40})/;

export function extractEventLead(
  item: { title: string; link: string; snippet: string },
  niche: string | null,
  city: string | null,
): LeadInput {
  const date = DATE_RE.exec(item.snippet)?.[0] ?? null;
  const venue = VENUE_RE.exec(item.snippet)?.[1]?.trim() ?? null;
  return {
    businessName: item.title.replace(/\s*[|\-–].*$/, "").trim() || item.title,
    category: niche ? `event · ${niche}` : "event",
    city,
    website: item.link,
    source: "event",
    sourceUrl: item.link,
    offerAngle: [venue && `venue ${venue}`, date && `date ${date}`].filter(Boolean).join(", ") || null,
  };
}
