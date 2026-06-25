// Runnable self-check for the RFC822 builder + send guard.
// `npx tsx src/lib/gmail/send.check.ts`
import assert from "node:assert";
import { buildRfc822, toBase64Url } from "./message";
import { evaluateSend, type SendEval } from "@/lib/outreach/sendGuard";

// --- RFC822 ---
const raw = buildRfc822({
  from: "Tevin <hi@zv.com>",
  to: "lead@shop.com",
  subject: "Quick idea",
  body: "Line one\nLine two",
});
assert.ok(raw.includes("From: Tevin <hi@zv.com>"));
assert.ok(raw.includes("To: lead@shop.com"));
assert.ok(/\r\n\r\n/.test(raw), "header/body separated by blank line");

const b64 = toBase64Url('a+b/c==');
assert.ok(!/[+/=]/.test(b64), "base64url has no +, /, or =");
// round-trips
const decoded = Buffer.from(
  toBase64Url("hello world").replace(/-/g, "+").replace(/_/g, "/"),
  "base64",
).toString("utf-8");
assert.equal(decoded, "hello world");

// --- send guard ---
const base: SendEval = {
  mode: "manual_approval",
  approved: true,
  hasEmail: true,
  suppressed: false,
  capUsed: 0,
  dailyCap: 25,
  compliancePassed: true,
};

assert.equal(evaluateSend(base).action, "send");
assert.equal(evaluateSend({ ...base, hasEmail: false }).action, "block");
assert.equal(evaluateSend({ ...base, suppressed: true }).action, "block");
assert.equal(evaluateSend({ ...base, compliancePassed: false }).action, "block");
assert.equal(evaluateSend({ ...base, approved: false }).action, "block");
assert.equal(evaluateSend({ ...base, capUsed: 25 }).action, "block");

// draft_only never sends, ignores cap/approval
assert.equal(evaluateSend({ ...base, mode: "draft_only", approved: false, capUsed: 99 }).action, "draft");
// ...but still blocks on no email / suppression / failed compliance
assert.equal(evaluateSend({ ...base, mode: "draft_only", hasEmail: false }).action, "block");

// controlled_send still requires approval
assert.equal(evaluateSend({ ...base, mode: "controlled_send", approved: false }).action, "block");
assert.equal(evaluateSend({ ...base, mode: "controlled_send" }).action, "send");

console.log("send.check: all assertions passed");
