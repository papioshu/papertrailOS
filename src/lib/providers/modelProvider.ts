// Neutral text-generation provider. The default is a deterministic, keyless
// template composer; when a provider key is configured the live provider is
// used instead. The UI never names a vendor — see TERMINOLOGY.md.
import "server-only";
import type { DraftChannel } from "@/lib/outreach/complianceChecker";

export type DraftContext = {
  profileName: string;
  offer: string;
  rationale?: string;
  lead: {
    businessName: string;
    category?: string | null;
    city?: string | null;
    offerAngle?: string | null;
  };
  audit?: { summary: string; topFindings: string[] } | null;
  identity: {
    fromName?: string | null;
    legalName?: string | null;
    postalAddress?: string | null;
    optOutText?: string | null;
  };
};

export type Composed = { subject?: string; body: string };

export interface ModelProvider {
  readonly name: string;
  compose(ctx: DraftContext, channel: DraftChannel): Promise<Composed>;
}

const CHANNEL_LABEL: Record<DraftChannel, string> = {
  email: "a short cold email",
  dm: "a short, casual direct message",
  call: "a brief phone call script",
  followup1: "a short follow-up email (no claim of prior reply)",
  followup2: "a final short follow-up email (polite, easy to decline)",
};

function optOut(ctx: DraftContext): string {
  return ctx.identity.optOutText?.trim() || "Reply STOP to opt out.";
}

function signature(ctx: DraftContext): string {
  const name = ctx.identity.fromName || ctx.profileName;
  const org = ctx.identity.legalName || ctx.profileName;
  const addr = ctx.identity.postalAddress ? `\n${ctx.identity.postalAddress}` : "";
  return `${name}\n${org}${addr}`;
}

function reason(ctx: DraftContext): string {
  const f = ctx.audit?.topFindings?.[0];
  if (f) return `I took a look at your site and noticed ${f.toLowerCase()}`;
  if (ctx.lead.offerAngle) return `I had an idea around ${ctx.lead.offerAngle.toLowerCase()}`;
  return `I work with ${ctx.lead.category ?? "businesses"} like yours`;
}

// Deterministic, keyless composer. Produces real soft-approach copy.
export class TemplateProvider implements ModelProvider {
  readonly name = "template";

  async compose(ctx: DraftContext, channel: DraftChannel): Promise<Composed> {
    const biz = ctx.lead.businessName;
    const r = reason(ctx);
    const offer = ctx.offer;

    if (channel === "dm") {
      return {
        body: `Hey ${biz} — ${r}. I'm with ${ctx.profileName} and put together ${offer.toLowerCase()} for spots like yours. No pressure — worth a quick chat?`,
      };
    }
    if (channel === "call") {
      return {
        body:
          `Hi, is this ${biz}? My name's ${ctx.identity.fromName || "—"} with ${ctx.profileName}.\n` +
          `Reason I'm calling: ${r}. We do ${offer.toLowerCase()} and I thought it might be a fit.\n` +
          `Would it be worth a few minutes this week to see if it makes sense? Totally fine if not.`,
      };
    }

    const isFollow = channel === "followup1" || channel === "followup2";
    const opener =
      channel === "followup1"
        ? `Wanted to put this back on your radar — `
        : channel === "followup2"
          ? `Last note from me on this — `
          : "";
    const subject =
      channel === "followup2"
        ? `Closing the loop, ${biz}`
        : ctx.lead.offerAngle
          ? `Idea for ${biz}: ${ctx.lead.offerAngle}`
          : `Quick idea for ${biz}`;

    const body =
      `Hi,\n\n` +
      `${opener}${r}. I'm with ${ctx.profileName}, and ${offer.toLowerCase()} is something we could help with` +
      `${ctx.rationale ? ` — ${ctx.rationale.toLowerCase()}` : ""}.\n\n` +
      `${isFollow ? "If the timing's off, no worries at all." : "If you're open to it, I can share a couple of specifics."} ` +
      `Either way, appreciate your time.\n\n` +
      `${signature(ctx)}\n\n${optOut(ctx)}`;

    return { subject, body };
  }
}

// Live provider. Activated only when ANTHROPIC_API_KEY is present. Falls back
// to the template composer on any error (handled by the draft engine).
export class HostedProvider implements ModelProvider {
  readonly name = "hosted";

  async compose(ctx: DraftContext, channel: DraftChannel): Promise<Composed> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();

    const system =
      `You write outreach for ${ctx.profileName}, a creative/services studio. ` +
      `Tone: soft, natural, direct, human. No fake urgency, no fake prior contact, ` +
      `no overpromising, no fake familiarity. Give a clear, specific reason for reaching out. ` +
      `Keep it short. For emails, start with a "Subject:" line, then a blank line, then the body, ` +
      `and end the body with this sender block and opt-out line:\n${signature(ctx)}\n${optOut(ctx)}`;

    const user =
      `Write ${CHANNEL_LABEL[channel]} to ${ctx.lead.businessName}` +
      `${ctx.lead.city ? ` in ${ctx.lead.city}` : ""}.\n` +
      `Offer to lead with: ${ctx.offer}${ctx.rationale ? ` (${ctx.rationale})` : ""}.\n` +
      `Reason for reaching out: ${reason(ctx)}.` +
      (ctx.audit ? `\nWebsite audit: ${ctx.audit.summary}` : "");

    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const m = /^subject:\s*(.+?)\n+([\s\S]+)$/i.exec(text);
    if (m && channel !== "dm" && channel !== "call") {
      return { subject: m[1].trim(), body: m[2].trim() };
    }
    return { body: text };
  }
}

export function getModelProvider(): ModelProvider {
  return process.env.ANTHROPIC_API_KEY ? new HostedProvider() : new TemplateProvider();
}
