// Role-based access control. Roles are per-profile (via ProfileMembership);
// the Paper/Papers account carries a user-level super_admin flag that grants
// every permission on every profile.

export type Role = "super_admin" | "profile_admin" | "profile_member" | "viewer";

export type Permission =
  | "view" // read profile data
  | "edit_leads"
  | "run_leadgen"
  | "create_drafts"
  | "mark_status"
  | "manage_campaigns"
  | "manage_suppression"
  | "approve_send"
  | "manage_profile"
  | "view_archive"
  // super-admin only
  | "access_all_profiles"
  | "manage_users"
  | "manage_api"
  | "view_system_logs"
  | "fix_jobs"
  | "override_settings";

const PROFILE_ADMIN: Permission[] = [
  "view",
  "edit_leads",
  "run_leadgen",
  "create_drafts",
  "mark_status",
  "manage_campaigns",
  "manage_suppression",
  "approve_send",
  "manage_profile",
  "view_archive",
];

const PROFILE_MEMBER: Permission[] = [
  "view",
  "edit_leads",
  "run_leadgen",
  "create_drafts",
  "mark_status",
  "view_archive",
];

const VIEWER: Permission[] = ["view", "view_archive"];

const ROLE_PERMS: Record<Exclude<Role, "super_admin">, Permission[]> = {
  profile_admin: PROFILE_ADMIN,
  profile_member: PROFILE_MEMBER,
  viewer: VIEWER,
};

export function roleCan(role: Role, perm: Permission): boolean {
  if (role === "super_admin") return true;
  return ROLE_PERMS[role].includes(perm);
}

/**
 * Resolve whether a user may perform `perm` on a profile.
 * `isSuperAdmin` short-circuits to true. Otherwise the membership role on that
 * profile decides; no membership means no access.
 */
export function userCan(
  user: { isSuperAdmin: boolean },
  membershipRole: Role | null,
  perm: Permission,
): boolean {
  if (user.isSuperAdmin) return true;
  if (!membershipRole) return false;
  return roleCan(membershipRole, perm);
}
