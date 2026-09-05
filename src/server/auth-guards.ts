import "server-only";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import type { MemberRole } from "@/db/schema";

/**
 * Authorization helpers.
 *
 * Every query and mutation goes through one of these. Middleware only decides
 * whether a request reaches the app at all — it cannot know whether *this*
 * user may touch *this* project, so per-resource checks live here and run on
 * the server for every access.
 */

export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Current user id, or `null` when signed out. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

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

/** The user's role on a project, or `null` if they are not a member. */
export async function getProjectRole(
  projectId: string,
  userId: string,
): Promise<MemberRole | null> {
  const membership = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)),
    columns: { role: true },
  });

  return membership?.role ?? null;
}

/**
 * Assert the signed-in user holds at least `minimum` on the project.
 * Throws `AuthorizationError` rather than redirecting, so mutations can turn
 * it into a form error instead of a navigation.
 */
export async function requireProjectRole(
  projectId: string,
  minimum: MemberRole = "viewer",
): Promise<{ userId: string; role: MemberRole }> {
  const userId = await requireUserId();
  const role = await getProjectRole(projectId, userId);

  if (!role || !roleAtLeast(role, minimum)) {
    throw new AuthorizationError();
  }

  return { userId, role };
}
