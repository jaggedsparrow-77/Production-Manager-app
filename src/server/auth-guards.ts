import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import type { MemberRole } from "@/db/schema";

/**
 * Authorization helpers.
 *
 * Callboard is single-tenant per deployment: every signed-in user belongs to
 * the one organization running this instance, and every member sees every
 * show — there is no per-show membership to check. What varies is *role*
 * (owner/admin/member/viewer), so authorization here means "does the caller
 * hold at least this role", checked in the data layer on every query and
 * mutation. `src/proxy.ts` (Next's rename of middleware.ts) sets headers
 * only. See docs/adr/0003-authorization-in-the-data-layer.md.
 */

export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Current user id, or `null` when signed out.
 *
 * `cache()`d because a single page render typically walks the (app) layout,
 * a show layout, and the page itself, each needing the session — without
 * this every one of those would re-run its own auth lookup.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.id ?? null;
});

/** Current user id, redirecting to /login when signed out. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  return userId;
}

const ROLE_RANK: Record<MemberRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function roleAtLeast(role: MemberRole, minimum: MemberRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** The caller's organization membership, or `null` if they belong to none. */
export const getMembership = cache(
  async (userId: string): Promise<{ organizationId: string; role: MemberRole } | null> => {
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
      columns: { organizationId: true, role: true },
    });
    return membership ?? null;
  },
);

/**
 * Assert the signed-in user belongs to an organization with at least
 * `minimum` role. Throws `AuthorizationError` rather than redirecting, so
 * mutations can turn it into a form error instead of a navigation.
 */
export async function requireOrgRole(
  minimum: MemberRole = "viewer",
): Promise<{ userId: string; organizationId: string; role: MemberRole }> {
  const userId = await requireUserId();
  const membership = await getMembership(userId);

  if (!membership || !roleAtLeast(membership.role, minimum)) {
    throw new AuthorizationError();
  }

  return { userId, organizationId: membership.organizationId, role: membership.role };
}

/**
 * Same as `requireOrgRole`, but redirects to /login rather than throwing —
 * for use in page components, where a mutation-style form error has nowhere
 * to render. A signed-in user with no organization is a data problem (the
 * seed always creates one), not a page the user can retry their way out of,
 * so it also redirects rather than rendering a broken page.
 */
export async function requireMembership(
  minimum: MemberRole = "viewer",
): Promise<{ userId: string; organizationId: string; role: MemberRole }> {
  const userId = await requireUserId();
  const membership = await getMembership(userId);
  if (!membership || !roleAtLeast(membership.role, minimum)) redirect("/login");
  return { userId, organizationId: membership.organizationId, role: membership.role };
}
