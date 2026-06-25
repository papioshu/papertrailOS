// Website Audit engine. Fetches a lead's site and runs deterministic HTML
// checks — no API key, no headless browser. ponytail: regex/string checks on
// raw HTML (not a DOM parser) and no broken-link crawl; both are heuristics,
// upgrade to cheerio/Playwright only if findings prove too coarse.

export type CheckStatus = "pass" | "warn" | "fail";
export type AuditCategory =
  | "mobile"
  | "seo"
  | "conversion"
  | "trust"
  | "content";

export type Finding = {
  key: string;
  label: string;
  status: CheckStatus;
  evidence: string;
  impact: number; // points lost in its category on fail (half on warn)
  suggestion: string;
  category: AuditCategory;
};

export type AuditScores = {
  websiteScore: number;
  mobileScore: number;
  seoScore: number;
  conversionScore: number;
  trustScore: number;
  contentScore: number;
};

export type AuditResult = AuditScores & {
  ok: boolean;
  findings: Finding[];
  summary: string;
  error?: string;
};

const CATEGORIES: AuditCategory[] = [
  "mobile",
  "seo",
  "conversion",
  "trust",
  "content",
];

/** Pure: derive findings from fetched HTML + the final (post-redirect) URL. */
export function analyzeHtml(html: string, finalUrl: string): Finding[] {
  const h = html.toLowerCase();
  const findings: Finding[] = [];
  const now = new Date().getFullYear();

  const add = (
    key: string,
    label: string,
    ok: boolean,
    category: AuditCategory,
    impact: number,
    evidence: string,
    suggestion: string,
    warn = false,
  ) =>
    findings.push({
      key,
      label,
      status: ok ? "pass" : warn ? "warn" : "fail",
      evidence,
      impact,
      suggestion,
      category,
    });

  // SSL
  const https = finalUrl.startsWith("https://");
  add("ssl", "Secure (HTTPS)", https, "trust", 25,
    https ? "Served over HTTPS" : "No HTTPS",
    "Install an SSL certificate and force HTTPS.");

  // Title
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  add("title", "Page title", title.length >= 10, "seo", 25,
    title ? `"${title.slice(0, 60)}"` : "Missing <title>",
    "Add a descriptive, keyword-aware page title.", title.length > 0 && title.length < 10);

  // Meta description
  const hasMeta = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html);
  add("meta", "Meta description", hasMeta, "seo", 15,
    hasMeta ? "Present" : "Missing or too short",
    "Add a 120–160 char meta description.");

  // Mobile / viewport
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  add("viewport", "Mobile viewport", viewport, "mobile", 60,
    viewport ? "Viewport meta present" : "No viewport meta tag",
    "Add a responsive viewport meta tag.");

  // CTA
  const cta = /(book\s*(now|online)?|get\s+a?\s*quote|schedule|contact\s+us|sign\s*up|call\s+now)/i.test(h);
  add("cta", "Clear call to action", cta, "conversion", 35,
    cta ? "CTA language found" : "No obvious CTA",
    "Add a prominent primary CTA (Book, Quote, Contact).");

  // Contact / booking path
  const contact = /(mailto:|tel:|<form|book\s*now|appointment|booking)/i.test(h);
  add("contact", "Contact / booking path", contact, "conversion", 30,
    contact ? "Contact or booking element found" : "No contact form / booking",
    "Add a contact form or booking button.");

  // Social links
  const social = /(instagram\.com|facebook\.com|tiktok\.com|linkedin\.com|twitter\.com|x\.com)/i.test(h);
  add("social", "Social links", social, "content", 20,
    social ? "Social profiles linked" : "No social links",
    "Link active social profiles.");

  // Media
  const imgs = (h.match(/<img\b/g) ?? []).length;
  const hasVideo = /<video\b|youtube\.com|vimeo\.com/i.test(h);
  const media = imgs >= 3 || hasVideo;
  add("media", "Photos / video", media, "content", 25,
    `${imgs} image tag(s)${hasVideo ? ", video present" : ""}`,
    "Add quality photos or video.", imgs > 0 && imgs < 3 && !hasVideo);

  // Copyright freshness
  const yr = /(?:©|copyright|&copy;)\s*(\d{4})/i.exec(html)?.[1];
  if (yr) {
    const stale = Number(yr) < now - 1;
    add("copyright", "Copyright year", !stale, "trust", 15,
      `Footer year ${yr}`, "Update the footer copyright year.", stale);
  }

  return findings;
}

/** Pure: roll findings up into per-category and overall scores. */
export function scoreFindings(findings: Finding[]): AuditScores {
  const per: Record<AuditCategory, number> = {
    mobile: 100, seo: 100, conversion: 100, trust: 100, content: 100,
  };
  for (const f of findings) {
    if (f.status === "fail") per[f.category] -= f.impact;
    else if (f.status === "warn") per[f.category] -= Math.round(f.impact / 2);
  }
  for (const c of CATEGORIES) per[c] = Math.max(0, Math.min(100, per[c]));
  const overall = Math.round(
    (per.mobile + per.seo + per.conversion + per.trust + per.content) / 5,
  );
  return {
    websiteScore: overall,
    mobileScore: per.mobile,
    seoScore: per.seo,
    conversionScore: per.conversion,
    trustScore: per.trust,
    contentScore: per.content,
  };
}

export function summarize(scores: AuditScores, findings: Finding[]): string {
  const fails = findings.filter((f) => f.status === "fail").map((f) => f.label);
  if (scores.websiteScore >= 85) return "Strong digital presence; little to fix.";
  const lead = fails.length
    ? `Weak points: ${fails.slice(0, 3).join(", ")}.`
    : "Minor improvements available.";
  return `Site scores ${scores.websiteScore}/100. ${lead}`;
}

/** Fetch + audit a single URL. Never throws; returns ok:false with a reason. */
export async function auditWebsite(rawUrl: string): Promise<AuditResult> {
  const empty: AuditScores = {
    websiteScore: 0, mobileScore: 0, seoScore: 0,
    conversionScore: 0, trustScore: 0, contentScore: 0,
  };
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "PapertrailOS-Audit/1.0" },
    });
    const html = await res.text();
    const findings = analyzeHtml(html, res.url || url);
    const scores = scoreFindings(findings);
    return { ok: true, ...scores, findings, summary: summarize(scores, findings) };
  } catch (e) {
    return {
      ok: false, ...empty, findings: [],
      summary: "Could not reach the website.",
      error: e instanceof Error ? e.message : "fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
