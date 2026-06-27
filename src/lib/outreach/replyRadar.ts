// Reply Radar classification. Deterministic keyword rules over the reply text;
// order encodes priority (a bounce outranks an opt-out, etc.). No model call.

export type ReplyClass =
  | "Interested"
  | "Question"
  | "Not Interested"
  | "Opt Out"
  | "Bounce"
  | "Complaint"
  | "Needs Manual Reply"
  | "Unknown";

const BOUNCE = /(mailer-daemon|delivery (has )?failed|undeliverable|address not found|recipient.*not found|550[ -]\d|message could not be delivered)/i;
const OPT_OUT = /(unsubscribe|opt[\s-]?out|remove me|take me off|stop (emailing|contacting)|do not (email|contact))/i;
const COMPLAINT = /(this is spam|report(ing)? you|cease and desist|harass|unsolicited|reported as spam)/i;
const NOT_INTERESTED = /(not interested|no thank|no thanks|we'?re all set|not at this time|please pass|already have|not a fit)/i;
const INTERESTED = /(interested|sounds good|let'?s (talk|chat|connect)|tell me more|how much|what.*cost|pricing|book a|set up a|schedule|happy to|would love)/i;
const QUESTION = /(\?|^(can|could|what|how|do you|would you|when|where|which)\b)/i;

/** Classify an inbound reply snippet/body. */
export function classifyReply(text: string): ReplyClass {
  const t = (text ?? "").trim();
  if (!t) return "Unknown";
  if (BOUNCE.test(t)) return "Bounce";
  if (OPT_OUT.test(t)) return "Opt Out";
  if (COMPLAINT.test(t)) return "Complaint";
  if (NOT_INTERESTED.test(t)) return "Not Interested";
  if (INTERESTED.test(t)) return "Interested";
  if (QUESTION.test(t)) return "Question";
  return "Needs Manual Reply";
}

// Map a classification to the lead status it should drive the lead to.
export const CLASS_TO_STATUS: Record<ReplyClass, string> = {
  Interested: "Interested",
  Question: "Replied",
  "Not Interested": "Not Interested",
  "Opt Out": "Opted Out",
  Bounce: "Do Not Contact",
  Complaint: "Do Not Contact",
  "Needs Manual Reply": "Replied",
  Unknown: "Replied",
};

// Classifications that stop all further outreach (cancel pending follow-ups).
export const STOP_CLASSES: ReadonlySet<ReplyClass> = new Set([
  "Opt Out",
  "Bounce",
  "Complaint",
  "Not Interested",
]);
