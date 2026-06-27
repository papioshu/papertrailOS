import { prisma } from "@/lib/prisma";
import { runLeadTrail } from "@/lib/automation/leadTrail";
import type { ProfileSlug } from "@/lib/profiles";

// Automation entry point for an external scheduler (cron, GitHub Action, etc.).
// Auth is a shared bearer token so it can run without a user session:
//   curl -X POST $APP_URL/api/automation/run-lead-trail \
//     -H "authorization: Bearer $AUTOMATION_TOKEN" \
//     -d '{"profile":"zathena","collect":{"sourceType":"local","niche":"barbers","city":"Fort Worth","maxLeads":25}}'
export async function POST(req: Request) {
  const token = process.env.AUTOMATION_TOKEN;
  if (!token) {
    return Response.json({ error: "AUTOMATION_TOKEN is not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    profile?: string;
    campaignId?: string;
    autoApprove?: boolean;
    collect?: {
      niche?: string;
      city?: string;
      state?: string;
      sourceType: string;
      maxLeads?: number;
    };
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.profile) return Response.json({ error: "Missing 'profile'." }, { status: 400 });

  const profile = await prisma.profile.findUnique({ where: { slug: body.profile } });
  if (!profile) return Response.json({ error: "Unknown profile." }, { status: 404 });

  const result = await runLeadTrail(profile.id, profile.slug as ProfileSlug, {
    campaignId: body.campaignId ?? null,
    autoApprove: Boolean(body.autoApprove),
    collect: body.collect
      ? { ...body.collect, maxLeads: body.collect.maxLeads ?? 25 }
      : null,
  });
  return Response.json(result);
}
