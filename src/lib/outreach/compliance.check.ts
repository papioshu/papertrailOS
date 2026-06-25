// Runnable self-check. `npx tsx src/lib/outreach/compliance.check.ts`
import assert from "node:assert";
import { checkCompliance } from "./complianceChecker";

const goodIdentity = {
  legalName: "Zathena Ventures LLC",
  fromName: "Tevin",
  postalAddress: "123 Main St, Fort Worth, TX",
  optOutText: "Reply STOP to opt out.",
};

// A clean compliant email passes.
const ok = checkCompliance({
  channel: "email",
  subject: "Quick idea for your booking flow",
  body: "Hi — I noticed your site has no online booking. I help local shops add one. Open to a quick look? Reply STOP to opt out. — Tevin, Zathena Ventures, 123 Main St.",
  identity: goodIdentity,
});
assert.equal(ok.status, "pass", JSON.stringify(ok.reasons));

// Fake "Re:" subject + fake prior contact + no opt-out + missing address all fail.
const bad = checkCompliance({
  channel: "email",
  subject: "Re: our conversation",
  body: "As we discussed, act now to claim your spot!",
  identity: { fromName: "X" },
});
assert.equal(bad.status, "fail");
assert.equal(bad.risk, "high");
assert.ok(bad.reasons.some((r) => /prior thread/i.test(r)));
assert.ok(bad.reasons.some((r) => /prior contact/i.test(r)));
assert.ok(bad.reasons.some((r) => /urgency/i.test(r)));
assert.ok(bad.reasons.some((r) => /opt-out/i.test(r)));
assert.ok(bad.reasons.some((r) => /postal address/i.test(r)));

// DM channel doesn't require postal address / opt-out.
const dm = checkCompliance({
  channel: "dm",
  body: "Hey! Love what you're doing — I shoot event recaps and think we'd be a fit. Worth a chat?",
  identity: {},
});
assert.equal(dm.status, "pass", JSON.stringify(dm.reasons));

// "Re:" is fine when there IS prior contact.
const withPrior = checkCompliance({
  channel: "email",
  subject: "Re: your booking flow",
  body: "Following up on our call — here's that link. Reply STOP to opt out. Zathena Ventures, 123 Main St.",
  identity: goodIdentity,
  hasPriorContact: true,
});
assert.equal(withPrior.status, "pass", JSON.stringify(withPrior.reasons));

console.log("compliance.check: all assertions passed");
