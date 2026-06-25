import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/guard";
import { authUrl, googleConfigured } from "@/lib/gmail/gmail";

// Starts the Gmail consent flow for a profile. Only a profile admin/super admin
// may connect an account.
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("profile");
  if (!slug) return NextResponse.json({ error: "missing profile" }, { status: 400 });
  try {
    await requireProfile(slug, "manage_profile");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL(`/p/${slug}?gmail=unconfigured`, req.url));
  }
  return NextResponse.redirect(authUrl(slug));
}
