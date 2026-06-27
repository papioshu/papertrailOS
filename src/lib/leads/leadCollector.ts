import "server-only";
import type { LeadInput } from "@/lib/leads";
import { extractEventLead } from "./eventExtract";

// Pluggable lead-source providers. Local business via Google Places; event /
// content via Google Programmable Search. Each is graceful: unavailable when
// its keys are missing, so the automation can skip collection and continue.

export type CollectInput = {
  niche?: string | null;
  city?: string | null;
  state?: string | null;
  sourceType: string; // local | event | manual
  maxLeads: number;
};

export type CollectResult = { leads: LeadInput[]; note: string };

export function placesAvailable(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}
export function eventSearchAvailable(): boolean {
  return Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX);
}

/** Local business search via Google Places Text Search (new Places API). */
async function collectLocal(input: CollectInput): Promise<CollectResult> {
  if (!placesAvailable()) return { leads: [], note: "Places not configured (GOOGLE_PLACES_API_KEY)." };
  const query = [input.niche, "in", input.city, input.state].filter(Boolean).join(" ");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: Math.min(input.maxLeads, 20) }),
  });
  if (!res.ok) return { leads: [], note: `Places error: ${res.status}` };
  const data = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      formattedAddress?: string;
      websiteUri?: string;
      nationalPhoneNumber?: string;
    }>;
  };
  const leads: LeadInput[] = (data.places ?? []).map((p) => ({
    businessName: p.displayName?.text ?? "Unknown",
    category: input.niche ?? null,
    address: p.formattedAddress ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    source: "places",
  }));
  return { leads, note: `Places returned ${leads.length}.` };
}

/** Event/content search via Google Programmable Search JSON API. */
async function collectEvents(input: CollectInput): Promise<CollectResult> {
  if (!eventSearchAvailable()) {
    return { leads: [], note: "Event search not configured (GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX)." };
  }
  const q = [input.city, input.niche, "event"].filter(Boolean).join(" ");
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", process.env.GOOGLE_SEARCH_API_KEY!);
  url.searchParams.set("cx", process.env.GOOGLE_SEARCH_CX!);
  url.searchParams.set("q", q);
  const res = await fetch(url);
  if (!res.ok) return { leads: [], note: `Event search error: ${res.status}` };
  const data = (await res.json()) as {
    items?: Array<{ title: string; link: string; snippet: string }>;
  };
  const leads = (data.items ?? [])
    .slice(0, input.maxLeads)
    .map((it) => extractEventLead(it, input.niche ?? null, input.city ?? null));
  return { leads, note: `Event search returned ${leads.length}.` };
}

export async function collectLeads(input: CollectInput): Promise<CollectResult> {
  if (input.sourceType === "local" || input.sourceType === "places") return collectLocal(input);
  if (input.sourceType === "event") return collectEvents(input);
  return { leads: [], note: "Manual source — add leads or import a CSV." };
}
