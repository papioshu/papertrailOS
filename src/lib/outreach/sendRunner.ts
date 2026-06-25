import "server-only";
import { prisma } from "@/lib/prisma";
import { encodeMessage } from "@/lib/gmail/message";
import { createGmailDraft, sendGmailMessage } from "@/lib/gmail/gmail";
import { evaluateSend, type SendMode } from "./sendGuard";

const EMAIL_CHANNELS = new Set(["email", "followup1", "followup2"]);

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function sentToday(profileId: string): Promise<number> {
  return prisma.sendQueue.count({
    where: { profileId, status: "sent", sentAt: { gte: startOfToday() } },
  });
}

export type DispatchResult = {
  status: "drafted" | "sent" | "blocked";
  reason?: string;
  detail?: string;
};

/**
 * Evaluate and act on one draft: create a Gmail draft, controlled-send, or
 * block — recording the outcome in SendQueue. Idempotent on a sent draft
 * (never duplicate-sends).
 */
export async function dispatchDraft(
  profileId: string,
  draftId: string,
): Promise<DispatchResult> {
  const draft = await prisma.outreachDraft.findFirst({
    where: { id: draftId, profileId },
    include: {
      lead: { include: { profile: { include: { identity: true, settings: true, gmail: true } } } },
      sendItems: true,
    },
  });
  if (!draft) return { status: "blocked", reason: "Draft not found." };

  // Idempotency: if already sent, do nothing.
  if (draft.sendItems.some((s) => s.status === "sent")) {
    return { status: "sent", detail: "Already sent." };
  }

  const lead = draft.lead;
  const profile = lead.profile;
  const settings = profile.settings;
  const identity = profile.identity;
  const mode = (settings?.agentMode ?? "draft_only") as SendMode;

  if (!EMAIL_CHANNELS.has(draft.channel)) {
    return { status: "blocked", reason: "Only email channels can send via Gmail." };
  }

  const decision = evaluateSend({
    mode,
    approved: draft.approved,
    hasEmail: Boolean(lead.email),
    suppressed: false, // ponytail: suppression list lands in Phase 6
    capUsed: await sentToday(profileId),
    dailyCap: settings?.dailySendCap ?? 25,
    compliancePassed: draft.complianceStatus === "pass",
  });

  const record = async (data: {
    status: string;
    error?: string;
    gmailDraftId?: string;
    gmailMessageId?: string;
    sentAt?: Date;
  }) => {
    const existing = draft.sendItems[0];
    if (existing) {
      await prisma.sendQueue.update({
        where: { id: existing.id },
        data: { ...data, attempts: existing.attempts + 1 },
      });
    } else {
      await prisma.sendQueue.create({
        data: { profileId, leadId: lead.id, draftId, channel: draft.channel, attempts: 1, ...data },
      });
    }
  };

  if (decision.action === "block") {
    await record({ status: "blocked", error: decision.reason });
    return { status: "blocked", reason: decision.reason };
  }

  if (!profile.gmail) {
    await record({ status: "blocked", error: "Gmail not connected." });
    return { status: "blocked", reason: "Gmail not connected for this profile." };
  }

  const encoded = encodeMessage({
    from: `${identity?.fromName ?? profile.name} <${identity?.fromEmail ?? profile.gmail.email}>`,
    to: lead.email!,
    subject: draft.subject ?? `A note from ${profile.name}`,
    body: draft.body,
  });

  try {
    if (decision.action === "draft") {
      const id = await createGmailDraft(profile.gmail, encoded);
      await record({ status: "drafted", gmailDraftId: id });
      await prisma.activityLog.create({
        data: { profileId, action: "gmail_draft", detail: { draftId, gmailDraftId: id } },
      });
      return { status: "drafted", detail: "Gmail draft created." };
    }
    // controlled send
    const id = await sendGmailMessage(profile.gmail, encoded);
    await record({ status: "sent", gmailMessageId: id, sentAt: new Date() });
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "Contacted" } });
    await prisma.activityLog.create({
      data: { profileId, action: "gmail_send", detail: { draftId, gmailMessageId: id } },
    });
    return { status: "sent", detail: "Message sent." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send failed";
    await record({ status: "failed", error: msg });
    return { status: "blocked", reason: msg };
  }
}
