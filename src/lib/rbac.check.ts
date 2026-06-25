// Runnable self-check for RBAC. `npx tsx src/lib/rbac.check.ts`
import assert from "node:assert";
import { roleCan, userCan } from "./rbac";

const su = { isSuperAdmin: true };
const normal = { isSuperAdmin: false };

// super_admin flag overrides everything, even with no membership.
assert.equal(userCan(su, null, "override_settings"), true);
assert.equal(userCan(su, null, "manage_users"), true);

// no membership + not super = nothing.
assert.equal(userCan(normal, null, "view"), false);

// profile_admin can manage but is not a super-admin.
assert.equal(userCan(normal, "profile_admin", "approve_send"), true);
assert.equal(userCan(normal, "profile_admin", "manage_users"), false);

// member can work leads but cannot approve sends or manage the profile.
assert.equal(userCan(normal, "profile_member", "create_drafts"), true);
assert.equal(userCan(normal, "profile_member", "approve_send"), false);
assert.equal(userCan(normal, "profile_member", "manage_profile"), false);

// viewer is read-only.
assert.equal(userCan(normal, "viewer", "view"), true);
assert.equal(userCan(normal, "viewer", "edit_leads"), false);

assert.equal(roleCan("super_admin", "fix_jobs"), true);

console.log("rbac.check: all assertions passed");
