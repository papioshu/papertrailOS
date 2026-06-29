import assert from "node:assert";
import { extractFromHtml } from "./enrichmentEngine";

const html = `
<html><head>
  <title>Neon Palms Lounge</title>
  <meta name="description" content="DFW's late-night lounge and event venue.">
</head><body>
  <a href="/contact">Contact Us</a>
  <a href="https://calendly.com/neonpalms">Book Now</a>
  <a href="https://instagram.com/neonpalms">IG</a>
  <a href="https://facebook.com/neonpalms">FB</a>
  <p>Reach us at booking@neonpalms.com or (817) 555-0142.</p>
  <img src="a.jpg"><img src="b.jpg"><img src="c.jpg">
  <footer>© 2021 Neon Palms</footer>
</body></html>`;

const e = extractFromHtml(html, "https://neonpalms.com/");

assert.equal(e.title, "Neon Palms Lounge", "title");
assert(e.metaDescription?.includes("late-night"), "meta description");
assert(e.emails.includes("booking@neonpalms.com"), "extracts email");
assert(e.phones.some((p) => p.replace(/\D/g, "") === "8175550142"), "extracts phone");
assert(e.contactUrl === "https://neonpalms.com/contact", "resolves relative contact URL");
assert(e.bookingUrl?.includes("calendly"), "booking URL");
assert(e.instagramUrl?.includes("instagram.com/neonpalms"), "instagram");
assert(e.facebookUrl?.includes("facebook.com/neonpalms"), "facebook");
assert(/contact|book/i.test(e.ctaText ?? ""), "CTA text (first visible CTA)");
assert.equal(e.copyrightYear, 2021, "copyright year");
assert.equal(e.hasMedia, true, "media present (3 imgs)");

// Junk emails (asset filenames) are filtered out.
const junk = extractFromHtml(`<p>logo@2x.png a@example.com real@biz.co</p>`, "https://x.co");
assert(junk.emails.includes("real@biz.co"), "keeps real email");
assert(!junk.emails.some((x) => x.includes("example.")), "drops example email");

console.log("enrichmentEngine.check: all assertions passed");
