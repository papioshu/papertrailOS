import { requireProfile } from "@/lib/guard";
import { listLeads } from "@/lib/leads";
import { toCsv } from "@/lib/csv";

const COLUMNS = [
  "businessName", "category", "address", "city", "state", "phone", "website",
  "email", "instagram", "facebook", "tiktok", "linkedin", "googleRating",
  "reviewCount", "offerAngle", "leadScore", "status", "source", "sourceUrl",
  "createdAt",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const { profile } = await requireProfile(slug, "view_archive");
    const campaignId = new URL(req.url).searchParams.get("c") ?? undefined;
    const leads = await listLeads(profile.id, campaignId);
    const csv = toCsv(COLUMNS, leads as unknown as Record<string, unknown>[]);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${slug}-leads.csv"`,
      },
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}
