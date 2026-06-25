// Deterministic cold-email compliance check. Runs before any draft can be
// approved or queued. No model call — these are hard rules.

export type DraftChannel = "email" | "dm" | "call" | "followup1" | "followup2";

export type ComplianceIdentity = {
  legalName?: string | null;
  fromName?: string | null;
  postalAddress?: string | null;
  optOutText?: string | null;
};

export type ComplianceInput = {
  channel: DraftChannel;
  subject?: string | null;
  body: string;
  identity: ComplianceIdentity;
  hasPriorContact?: boolean;
};

export type ComplianceResult = {
  status: "pass" | "fail";
  risk: "low" | "medium" | "high";
  reasons: string[];
};

// Channels that send commercial email and therefore need CAN-SPAM identity + opt-out.
const EMAIL_CHANNELS: ReadonlySet<DraftChannel> = new Set([
  "email",
  "followup1",
  "followup2",
]);

const DECEPTIVE_SUBJECT = /\b(re|fwd):/i;
const FALSE_URGENCY = /\b(act now|urgent|last chance|expires? (today|soon)|limited time|don'?t miss)\b/i;
const FAKE_PRIOR = /\b(as (we )?discussed|per our (call|conversation)|following up on our|circling back|as promised|nice (talking|speaking) (to|with) you)\b/i;
const OPT_OUT = /(unsubscribe|opt[\s-]?out|reply\s+stop|no longer wish|prefer not to hear|let me know.*stop)/i;

export function checkCompliance(input: ComplianceInput): ComplianceResult {
  const reasons: string[] = [];
  const subject = input.subject ?? "";
  const body = input.body ?? "";
  const isEmail = EMAIL_CHANNELS.has(input.channel);

  if (isEmail && DECEPTIVE_SUBJECT.test(subject) && !input.hasPriorContact) {
    reasons.push('Subject implies a prior thread ("Re:"/"Fwd:") with no prior contact.');
  }
  if (FALSE_URGENCY.test(subject) || FALSE_URGENCY.test(body)) {
    reasons.push("Contains fake urgency language.");
  }
  if (!input.hasPriorContact && FAKE_PRIOR.test(body)) {
    reasons.push("Claims prior contact that did not happen.");
  }
  if (isEmail) {
    if (!OPT_OUT.test(body)) reasons.push("Missing an opt-out / unsubscribe line.");
    if (!input.identity.legalName && !input.identity.fromName) {
      reasons.push("Business identity (sender name) is not configured.");
    }
    if (!input.identity.postalAddress) {
      reasons.push("A postal address is required for commercial email.");
    }
  }
  if (body.trim().length < 20) reasons.push("Body is too short to be meaningful.");

  const risk = reasons.length === 0 ? "low" : reasons.length <= 1 ? "medium" : "high";
  return { status: reasons.length === 0 ? "pass" : "fail", risk, reasons };
}
