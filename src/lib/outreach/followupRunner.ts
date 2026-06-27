import "server-only";
import { prisma } from "@/lib/prisma";
import { dispatchDraft } from "./sendRunner";

// Statuses that mean the conversation has moved on — no follow-up should fire.
const STOP_STATUSES: ReadonlySet<string> = new Set([
  "Replied", "Interested", "Not Interested", "Do Not Contact",
  "Opted Out", "Customer", "Closed", "Archived", "Not Fit",
]);

/**
 * Send every due follow-up through the same send guard. Skips (cancels) any
 * whose lead has replied, opted out, or closed since scheduling, and never
 * exceeds the two configured touches.
 */
export async function runDueFollowups(
  profileId: string,
): Promise<{ sent: number; skipped: number }> {
  const due = await prisma.followup.findMany({
    where: { profileId, status: "scheduled", scheduledFor: { lte: new Date() } },
    include: { lead: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const f of due) {
    if (STOP_STATUSES.has(f.lead.status)) {
      await prisma.followup.update({ where: { id: f.id }, data: { status: "skipped" } });
      skipped++;
      continue;
    }
    const draft = await prisma.outreachDraft.findFirst({
      where: { leadId: f.leadId, channel: f.channel, profileId },
    });
    if (!draft) {
      await prisma.followup.update({ where: { id: f.id }, data: { status: "skipped" } });
      skipped++;
      continue;
    }

    const result = await dispatchDraft(profileId, draft.id);
    if (result.status === "sent" || result.status === "drafted") {
      await prisma.followup.update({
        where: { id: f.id },
        data: { status: "sent", sentAt: new Date() },
      });
      sent++;
    } else {
      await prisma.followup.update({ where: { id: f.id }, data: { status: "skipped" } });
      skipped++;
    }
  }

  await prisma.activityLog.create({
    data: { profileId, action: "run_followups", detail: { sent, skipped } },
  });
  return { sent, skipped };
}
