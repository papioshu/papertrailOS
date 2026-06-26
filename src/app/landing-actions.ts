"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProfileBrand } from "@/lib/profiles";

export type AccessResult = { error?: string } | null;

/**
 * Authenticate from a profile access card, then verify the account can open
 * that profile before routing in. Wrong credentials or no access surface as an
 * error on the card back — never a redirect to a generic login screen.
 */
export async function accessProfile(
  slug: string,
  _prev: AccessResult,
  formData: FormData,
): Promise<AccessResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { profile: true } } },
  });
  const brand = getProfileBrand(slug);
  const hasAccess =
    user?.isSuperAdmin || user?.memberships.some((m) => m.profile.slug === slug);
  if (!hasAccess) {
    return { error: `This account can't open ${brand?.name ?? slug}.` };
  }

  redirect(`/p/${slug}`);
}
