// Runnable self-check. `npx tsx src/lib/outreach/replyRadar.check.ts`
import assert from "node:assert";
import { classifyReply, CLASS_TO_STATUS, STOP_CLASSES } from "./replyRadar";

assert.equal(classifyReply("Mailer-Daemon: delivery has failed"), "Bounce");
assert.equal(classifyReply("Please unsubscribe me from this list"), "Opt Out");
assert.equal(classifyReply("This is spam, I'm reporting you"), "Complaint");
assert.equal(classifyReply("Thanks but we're all set, not interested"), "Not Interested");
assert.equal(classifyReply("Sounds good — how much does it cost?"), "Interested");
assert.equal(classifyReply("Can you send more details"), "Question");
assert.equal(classifyReply("ok"), "Needs Manual Reply");
assert.equal(classifyReply(""), "Unknown");

// priority: bounce outranks an opt-out phrase in the same text
assert.equal(classifyReply("delivery has failed; please remove me"), "Bounce");
// opt-out outranks interested
assert.equal(classifyReply("interested? no — unsubscribe me"), "Opt Out");

// status + stop mapping
assert.equal(CLASS_TO_STATUS["Opt Out"], "Opted Out");
assert.equal(CLASS_TO_STATUS.Interested, "Interested");
assert.ok(STOP_CLASSES.has("Bounce"));
assert.ok(!STOP_CLASSES.has("Interested"));

console.log("replyRadar.check: all assertions passed");
