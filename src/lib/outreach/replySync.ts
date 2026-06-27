import "server-only";
import { prisma } from "@/lib/prisma";
import { getThreadInbound } from "@/lib/gmail/gmail";
import { classifyReply, CLASS_TO_STATUS, STOP_CLASSES, type ReplyClass } from "./replyRadar";

/**
 * Reply Radar sync. Scans each sent message's Gmail thread for inbound replies,
 * records and classifies new ones, advances the lead's CRM status, and cancels
 * pending follow-ups when a reply ends the conversation (opt-out/bounce/etc.).
 */
export async function syncReplies(
  profileId: string,
): Promise<{ scanned: number; found: number; errors: number }> {
  const conn = await prisma.gmailConnection.findUnique({ where: { profileId } });
  if (!conn) throw new Error("Gmail is not connected for this profile.");

  const sent = await prisma.sendQueue.findMany({
    where: { profileId, status: "sent", gmailThreadId: { not: null } },
  });

  let scanned = 0;
  let found = 0;
  let errors = 0;

  for (const item of sent) {
    scanned++;
    try {
      const inbound = await getThreadInbound(conn, item.gmailThreadId!, conn.email);
      for (const msg of inbound) {
        const exists = await prisma.reply.findUnique({ where: { gmailMessageId: msg.id } });
        if (exists) continue;

        const classification = classifyReply(msg.snippet) as ReplyClass;
        await prisma.reply.create({
          data: {
            profileId,
            leadId: item.leadId,
            sendQueueId: item.id,
            gmailMessageId: msg.id,
            gmailThreadId: item.gmailThreadId,
            fromEmail: msg.from,
            snippet: msg.snippet,
            classification,
            receivedAt: msg.receivedAt,
          },
        });
        await prisma.lead.update({
          where: { id: item.leadId },
          data: { status: CLASS_TO_STATUS[classification] },
        });
        if (STOP_CLASSES.has(classification)) {
          await prisma.followup.updateMany({
            where: { leadId: item.leadId, status: "scheduled" },
            data: { status: "canceled" },
          });
        }
        found++;
      }
    } catch {
      errors++;
    }
  }

  await prisma.activityLog.create({
    data: { profileId, action: "reply_sync", detail: { scanned, found, errors } },
  });
  return { scanned, found, errors };
}
