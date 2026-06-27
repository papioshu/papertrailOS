import "server-only";
import { prisma } from "@/lib/prisma";
import type { ProfileSlug } from "@/lib/profiles";
import { collectLeads } from "@/lib/leads/leadCollector";
import { importLeads } from "@/lib/leads";
import { runAuditAndGrade } from "@/lib/audit/runAudit";
import { composeDraftsForLead } from "@/lib/outreach/draftEngine";
import { dispatchDraft } from "@/lib/outreach/sendRunner";
import { syncReplies } from "@/lib/outreach/replySync";
import { runDueFollowups } from "@/lib/outreach/followupRunner";

export type LeadTrailOptions = {
  campaignId?: string | null;
  collect?: {
    niche?: string | null;
    city?: string | null;
    state?: string | null;
    sourceType: string;
    maxLeads: number;
  } | null;
  // Auto-approve compliant email drafts. Off by default — approval is a gate.
  autoApprove?: boolean;
};

export type LeadTrailLog = { stage: string; detail: string }[];

/**
 * The Lead Trail: runs the full pipeline end-to-end in one pass —
 * Collect → Audit/Grade → Draft → Approve → Send → Reply Radar → Follow Up →
 * Archive. Each stage is isolated so one failure doesn't abort the run, and
 * the send stage stays behind the same guard (mode + approval + daily cap), so
 * automation can never become a spam cannon. Records progress to a JobRun.
 *
 * ponytail: runs synchronously in-process. Fine for per-campaign volumes; move
 * to a queued worker if a single run grows to thousands of leads.
 */
export async function runLeadTrail(
  profileId: string,
  slug: ProfileSlug,
  opts: LeadTrailOptions,
): Promise<{ jobId: string; log: LeadTrailLog }> {
  const job = await prisma.jobRun.create({
    data: { profileId, kind: "lead_trail", status: "running", stage: "Collect" },
  });
  const log: LeadTrailLog = [];
  const where = { profileId, ...(opts.campaignId ? { campaignId: opts.campaignId } : {}) };

  const step = async (stage: string, fn: () => Promise<string>) => {
    await prisma.jobRun.update({ where: { id: job.id }, data: { stage } });
    try {
      log.push({ stage, detail: await fn() });
    } catch (e) {
      log.push({ stage, detail: `error: ${e instanceof Error ? e.message : "failed"}` });
    }
  };

  await step("Collect", async () => {
    if (!opts.collect) return "skipped — no source configured";
    const { leads, note } = await collectLeads(opts.collect);
    if (leads.length === 0) return note;
    const { imported, duplicates } = await importLeads(profileId, opts.campaignId ?? null, leads);
    return `${note} imported ${imported}, ${duplicates} duplicate(s)`;
  });

  await step("Audit & Grade", async () => {
    const r = await runAuditAndGrade(profileId, slug, opts.campaignId ?? null);
    return `audited ${r.audited}, graded ${r.graded}, ${r.unreachable} unreachable`;
  });

  await step("Draft", async () => {
    const leads = await prisma.lead.findMany({
      where: { ...where, drafts: { none: {} } },
      select: { id: true },
    });
    for (const l of leads) await composeDraftsForLead(profileId, slug, l.id);
    return `composed drafts for ${leads.length} lead(s)`;
  });

  await step("Approve", async () => {
    if (!opts.autoApprove) return "manual approval — left for review";
    const res = await prisma.outreachDraft.updateMany({
      where: { profileId, channel: "email", complianceStatus: "pass", approved: false },
      data: { approved: true, approvedBy: "automation", approvedAt: new Date() },
    });
    return `auto-approved ${res.count} compliant email draft(s)`;
  });

  await step("Send", async () => {
    const settings = await prisma.profileSettings.findUnique({ where: { profileId } });
    const mode = settings?.agentMode ?? "draft_only";
    if (mode !== "controlled_send") return `mode ${mode} — not auto-sending`;
    const drafts = await prisma.outreachDraft.findMany({
      where: { profileId, channel: "email", approved: true },
      select: { id: true },
    });
    let sent = 0;
    let blocked = 0;
    for (const d of drafts) {
      const r = await dispatchDraft(profileId, d.id);
      r.status === "sent" ? sent++ : blocked++;
    }
    return `sent ${sent}, ${blocked} held by guard`;
  });

  await step("Reply Radar", async () => {
    const conn = await prisma.gmailConnection.findUnique({ where: { profileId } });
    if (!conn) return "Gmail not connected";
    const r = await syncReplies(profileId);
    return `scanned ${r.scanned}, found ${r.found}`;
  });

  await step("Follow Up", async () => {
    const r = await runDueFollowups(profileId);
    return `sent ${r.sent}, skipped ${r.skipped}`;
  });

  await prisma.jobRun.update({
    where: { id: job.id },
    data: { status: "done", stage: "Archive", finishedAt: new Date(), log },
  });
  return { jobId: job.id, log };
}
