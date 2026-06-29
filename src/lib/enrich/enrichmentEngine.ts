// Enrichment worker — pull public contact + presence data from a fetched page.
// Audit judges quality; enrichment captures the actual values. Public pages
// only: no login walls, no aggressive social scraping. Social fields also
// accept manual entry upstream.

export type Enrichment = {
  title: string | null;
  metaDescription: string | null;
  emails: string[];
  phones: string[];
  contactUrl: string | null;
  bookingUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
  ctaText: string | null;
  copyrightYear: number | null;
  hasMedia: boolean;
};

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const HREF_RE = /<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
// Asset/file emails that aren't real contacts.
const JUNK_EMAIL = /\.(png|jpg|jpeg|gif|webp|svg|css|js)$|@(sentry|example)\./i;

function firstSocial(html: string, domain: RegExp): string | null {
  const m = new RegExp(`https?://[^"'\\s]*${domain.source}[^"'\\s]*`, "i").exec(html);
  return m ? m[0] : null;
}

/** Pure: extract enrichment fields from fetched HTML + final URL. */
export function extractFromHtml(html: string, finalUrl: string): Enrichment {
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || null;
  // Capture to the matching quote so apostrophes inside the content survive.
  const metaDescription =
    /<meta[^>]+name=["']description["'][^>]+content=(["'])(.*?)\1/i.exec(html)?.[2]?.trim() || null;

  const emails = [...new Set((html.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))]
    .filter((e) => !JUNK_EMAIL.test(e))
    .slice(0, 5);
  const phones = [...new Set((html.match(PHONE_RE) ?? []).map((p) => p.trim()))]
    .filter((p) => p.replace(/\D/g, "").length >= 10)
    .slice(0, 5);

  // Walk anchors once for contact/booking links + CTA text.
  let contactUrl: string | null = null;
  let bookingUrl: string | null = null;
  let ctaText: string | null = null;
  for (const m of html.matchAll(HREF_RE)) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const blob = `${href} ${text}`.toLowerCase();
    if (!bookingUrl && /(book|appointment|schedule|reserv|calendly|acuity)/i.test(blob)) bookingUrl = abs(href, finalUrl);
    if (!contactUrl && /(contact|get in touch|reach us)/i.test(blob)) contactUrl = abs(href, finalUrl);
    if (!ctaText && text && /(book\s*(now|online)?|get\s+a?\s*quote|schedule|contact\s+us|sign\s*up|call\s+now|reserve)/i.test(text))
      ctaText = text.slice(0, 60);
  }

  const yrStr = /(?:©|copyright|&copy;)\s*(\d{4})/i.exec(html)?.[1];
  const copyrightYear = yrStr ? Number(yrStr) : null;
  const imgs = (html.match(/<img\b/gi) ?? []).length;
  const hasMedia = imgs >= 3 || /<video\b|youtube\.com|vimeo\.com/i.test(html);

  return {
    title,
    metaDescription,
    emails,
    phones,
    contactUrl,
    bookingUrl,
    instagramUrl: firstSocial(html, /instagram\.com/),
    facebookUrl: firstSocial(html, /facebook\.com/),
    tiktokUrl: firstSocial(html, /tiktok\.com/),
    linkedinUrl: firstSocial(html, /linkedin\.com/),
    ctaText,
    copyrightYear,
    hasMedia,
  };
}

function abs(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/** Fetch + enrich a single URL. Never throws; returns null on failure. */
export async function enrichWebsite(rawUrl: string): Promise<Enrichment | null> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "PapertrailOS/1.0 (+research)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractFromHtml(html, res.url || url);
  } catch {
    return null;
  }
}
