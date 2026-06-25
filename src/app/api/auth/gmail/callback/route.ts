import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { exchangeCode, getUserEmail } from "@/lib/gmail/gmail";

// Google redirects here after consent. `state` carries the profile slug.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const slug = url.searchParams.get("state");
  if (!code || !slug) return NextResponse.redirect(new URL("/select", req.url));

  try {
    const { profile } = await requireProfile(slug, "manage_profile");
    const tokens = await exchangeCode(code);
    const email = await getUserEmail(tokens.access_token);
    const expiry = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.gmailConnection.upsert({
      where: { profileId: profile.id },
      update: {
        email,
        accessToken: tokens.access_token,
        expiry,
        // Google only returns a refresh token on first consent; keep the old one otherwise.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      },
      create: {
        profileId: profile.id,
        email,
        refreshToken: tokens.refresh_token ?? "",
        accessToken: tokens.access_token,
        expiry,
      },
    });
    return NextResponse.redirect(new URL(`/p/${slug}?gmail=connected`, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/p/${slug}?gmail=error`, req.url));
  }
}
