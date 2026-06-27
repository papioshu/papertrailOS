// Runnable self-check for event extraction. `npx tsx src/lib/leads/collector.check.ts`
import assert from "node:assert";
import { extractEventLead } from "./eventExtract";

const lead = extractEventLead(
  {
    title: "Summer Pool Party 2026 | Eventbrite",
    link: "https://eventbrite.com/e/summer-pool-party",
    snippet: "Join us Jul 18, 2026 at The Rooftop for a day of music and vendors.",
  },
  "pool party",
  "Fort Worth",
);

assert.equal(lead.businessName, "Summer Pool Party 2026");
assert.equal(lead.source, "event");
assert.equal(lead.sourceUrl, "https://eventbrite.com/e/summer-pool-party");
assert.equal(lead.city, "Fort Worth");
assert.ok(lead.category?.includes("event"));
assert.ok(lead.offerAngle?.includes("The Rooftop"), `venue: ${lead.offerAngle}`);
assert.ok(lead.offerAngle?.toLowerCase().includes("jul 18"), `date: ${lead.offerAngle}`);

// Missing date/venue still produces a usable lead.
const bare = extractEventLead(
  { title: "DFW Art Showcase", link: "https://x.com/a", snippet: "An art showcase." },
  null,
  null,
);
assert.equal(bare.businessName, "DFW Art Showcase");
assert.equal(bare.offerAngle, null);

console.log("collector.check: all assertions passed");
