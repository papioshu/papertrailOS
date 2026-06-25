// Deterministic send-eligibility gate. Decides whether an approved draft may
// create a Gmail draft, actually send, or be blocked — enforcing send mode,
// approval, suppression, and the daily cap. No network, no side effects.

export type SendMode = "draft_only" | "manual_approval" | "controlled_send";

export type SendEval = {
  mode: SendMode;
  approved: boolean;
  hasEmail: boolean;
  suppressed: boolean;
  capUsed: number;
  dailyCap: number;
  compliancePassed: boolean;
};

export type SendDecision = {
  action: "draft" | "send" | "block";
  reason?: string;
};

/**
 * draft_only      → only ever create a Gmail draft (never sends).
 * manual_approval → send only an approved, compliant draft within the cap.
 * controlled_send → same gates; approval still required until an admin disables it.
 */
export function evaluateSend(e: SendEval): SendDecision {
  if (!e.hasEmail) return { action: "block", reason: "No email address on this lead." };
  if (e.suppressed) return { action: "block", reason: "Lead is on the suppression list." };
  if (!e.compliancePassed) return { action: "block", reason: "Compliance check has not passed." };

  if (e.mode === "draft_only") return { action: "draft" };

  if (!e.approved) return { action: "block", reason: "Draft is not approved." };
  if (e.capUsed >= e.dailyCap) {
    return { action: "block", reason: `Daily send cap reached (${e.capUsed}/${e.dailyCap}).` };
  }
  return { action: "send" };
}
