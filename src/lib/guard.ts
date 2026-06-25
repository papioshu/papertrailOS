import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProfileRole } from "@/lib/access";
import { userCan, type Permission, type Role } from "@/lib/rbac";

export class AccessError extends Error {}

/**
 * Resolve the profile for `slug` and assert the signed-in user holds `perm`
 * on it. Throws AccessError otherwise. Returns the profile row + role so
 * callers query against the real profile id (never trust a client-supplied id).
 */
export async function requireProfile(slug: string, perm: Permission) {
  const session = await auth();
  if (!session?.user) throw new AccessError("Not authenticated");

  const role = await getProfileRole(slug);
  if (!role) throw new AccessError("No access to this profile");
  if (!userCan({ isSuperAdmin: session.user.isSuperAdmin }, role, perm)) {
    throw new AccessError("Insufficient permissions");
  }

  const profile = await prisma.profile.findUnique({ where: { slug } });
  if (!profile) throw new AccessError("Profile not found");

  return { profile, role: role as Role, userId: session.user.id };
}
