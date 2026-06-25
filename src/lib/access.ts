import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PROFILES, type ProfileSlug } from "@/lib/profiles";
import type { Role } from "@/lib/rbac";

export type AccessibleProfile = { slug: ProfileSlug; role: Role };

/**
 * Profiles the signed-in user may open, with their role on each.
 * super_admin (Paper account) sees every catalog profile.
 * Returns null when the database is unreachable / not configured, so the UI
 * can show a setup state instead of crashing.
 */
export async function getAccessibleProfiles(): Promise<AccessibleProfile[] | null> {
  const session = await auth();
  if (!session?.user) return [];

  try {
    if (session.user.isSuperAdmin) {
      return (Object.keys(PROFILES) as ProfileSlug[]).map((slug) => ({
        slug,
        role: "super_admin" as Role,
      }));
    }
    const memberships = await prisma.profileMembership.findMany({
      where: { userId: session.user.id },
      include: { profile: true },
    });
    return memberships
      .filter((m) => m.profile.slug in PROFILES)
      .map((m) => ({ slug: m.profile.slug as ProfileSlug, role: m.role as Role }));
  } catch {
    return null;
  }
}

/** Role on a single profile, or null if no access. null DB error also -> null. */
export async function getProfileRole(slug: string): Promise<Role | null> {
  const list = await getAccessibleProfiles();
  if (!list) return null;
  return list.find((p) => p.slug === slug)?.role ?? null;
}
