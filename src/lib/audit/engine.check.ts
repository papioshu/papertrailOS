// Runnable self-check for audit + grade + offer. `npx tsx src/lib/audit/engine.check.ts`
import assert from "node:assert";
import { analyzeHtml, scoreFindings } from "./auditEngine";
import { gradeLead, bandFor } from "@/lib/grade/gradingEngine";
import { matchOffer } from "@/lib/offer/offerMatch";

// A strong page: https, title, meta, viewport, CTA, contact, social, images.
const good = `<html><head><title>Best Barbers in Fort Worth</title>
<meta name="description" content="Top rated barbershop with online booking and great reviews">
<meta name="viewport" content="width=device-width"></head>
<body><a href="#book">Book now</a><a href="mailto:hi@x.com">Email</a>
<a href="https://instagram.com/x">IG</a><img><img><img>
<footer>© 2026 X</footer></body></html>`;
const goodFindings = analyzeHtml(good, "https://x.com");
const goodScores = scoreFindings(goodFindings);
assert.ok(goodScores.websiteScore >= 85, `expected strong, got ${goodScores.websiteScore}`);
assert.ok(goodFindings.every((f) => f.status !== "fail"));

// A weak page: http (no SSL), no title/meta/viewport/CTA/contact/social/media.
const bad = `<html><head></head><body><p>welcome</p></body></html>`;
const badFindings = analyzeHtml(bad, "http://x.com");
const badScores = scoreFindings(badFindings);
assert.ok(badScores.websiteScore < 60, `expected weak, got ${badScores.websiteScore}`);
assert.ok(badScores.mobileScore < 50); // viewport fail tanks mobile
assert.ok(badScores.conversionScore < 50); // no CTA / no contact path

// Grading: weak site + IG + DFW + no contact should beat a strong-site lead.
const weakLead = gradeLead(
  { website: "http://x.com", instagram: "x", city: "Fort Worth", phone: "817" },
  badScores,
);
const strongLead = gradeLead({ website: "https://x.com" }, goodScores);
assert.ok(weakLead.score > strongLead.score);
assert.equal(bandFor(95), "Hot Lead");
assert.equal(bandFor(30), "Not Fit");
assert.ok(weakLead.reasons.length > 1);

// Offer match respects profile + findings.
assert.equal(
  matchOffer("zathena", { website: null }, null).offer,
  "Full digital presence package",
);
assert.equal(
  matchOffer("caedis", { category: "music festival" }, null).offer,
  "Drone event footage",
);
assert.match(matchOffer("bombsquad", { category: "pop-up market" }, null).offer, /event/i);

console.log("engine.check: all assertions passed");
