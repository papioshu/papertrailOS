import assert from "node:assert";
import { gradeLead, bandFor } from "./gradingEngine";

// Band boundaries.
assert.equal(bandFor(39), "Not Fit");
assert.equal(bandFor(40), "Needs Review");
assert.equal(bandFor(60), "Qualified");
assert.equal(bandFor(75), "High Fit");
assert.equal(bandFor(90), "Hot Lead");

// A local DFW barber with no booking and reviews grades up.
const barber = gradeLead(
  { category: "barber shop", city: "Fort Worth", phone: "817-555-0100", reviewCount: 60, profileFit: "high", website: "x.com" },
  { websiteScore: 45, mobileScore: 50, seoScore: 40, conversionScore: 30, trustScore: 50, contentScore: 40 },
);
assert(barber.score >= 60, `barber should qualify, got ${barber.score}`);
assert(barber.urgencyScore.score >= 80, "no-booking → high urgency");
assert(barber.contactabilityScore.score >= 70, "has phone → contactable");

// Suppressed is forced to Not Fit regardless of other signals.
const supp = gradeLead({ category: "venue", city: "Dallas", email: "a@b.co", reviewCount: 200, suppressed: true });
assert.equal(supp.band, "Not Fit", "suppressed → Not Fit");
assert(supp.score <= 39, "suppressed score capped");

// Franchise is penalized on budget + headline.
const fr = gradeLead({ category: "Starbucks", city: "Dallas", phone: "1", reviewCount: 500 });
assert(fr.budgetLikelihoodScore.score <= 30, "franchise low budget likelihood");
assert(fr.reasons.some((r) => /franchise/i.test(r)), "franchise reason recorded");

// Event prospect scores event fit + partnered axis when flagged.
const venue = gradeLead({ category: "event venue", partnered: true });
assert(venue.eventFitScore.score >= 80, "event fit high");
assert(venue.partneredOpportunityScore.score >= 80, "partnered axis high");

// Every axis carries a non-empty reason.
for (const k of ["fitScore","urgencyScore","budgetLikelihoodScore","contactabilityScore","websiteScore","contentNeedScore","eventFitScore","partneredOpportunityScore"] as const) {
  assert(venue[k].reason.length > 0, `${k} has a reason`);
}

console.log("gradingEngine.check: all assertions passed");
