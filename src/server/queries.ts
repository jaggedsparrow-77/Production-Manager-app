import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { slugify } from "@/lib/utils";
import {
  activityEntries,
  budgetLines,
  departmentDocs,
  departmentNotes,
  departments,
  meetingActions,
  meetingMinutes,
  meetings,
  organizationMembers,
  organizations,
  scheduleCalls,
  shows,
  tasks,
  users,
} from "@/db/schema";
import { requireMembership } from "./auth-guards";

/**
 * Read side of the app.
 *
 * Callboard is single-tenant per deployment, so every query scopes to the
 * caller's organization — a show id from another org's data (there won't
 * normally be one, but a stale link or a copy-pasted id should still fail
 * closed) resolves to `null`/`notFound()` rather than leaking a row.
 */

async function getShowScoped(showId: string, organizationId: string) {
  const show = await db.query.shows.findFirst({
    where: and(eq(shows.id, showId), eq(shows.organizationId, organizationId)),
  });
  return show ?? null;
}

/**
 * Org name/currency for the header, and the shows list for the sidebar nav —
 * both the (app) layout and every show's own layout need these in the same
 * request, so they're `cache()`d to a single DB round trip per render.
 */
export const getCurrentOrganization = cache(async () => {
  const { organizationId } = await requireMembership();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  if (!org) notFound();
  return org;
});

export const listShowsForNav = cache(async () => {
  const { organizationId } = await requireMembership();

  return db.query.shows.findMany({
    where: and(eq(shows.organizationId, organizationId), isNull(shows.archivedAt)),
    orderBy: [asc(shows.openDate)],
    columns: { id: true, title: true, phase: true, state: true, openDate: true },
  });
});

/** The portfolio page: every show, budget rollups, season metrics, activity feed. */
export async function getPortfolio() {
  const { organizationId } = await requireMembership();

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  if (!org) notFound();

  const showRows = await db.query.shows.findMany({
    where: and(eq(shows.organizationId, organizationId), isNull(shows.archivedAt)),
    orderBy: [asc(shows.openDate)],
  });
  const showIds = showRows.map((s) => s.id);

  const [budgetTotals, nextCalls, feedRows] = await Promise.all([
    showIds.length === 0
      ? []
      : db
          .select({
            showId: budgetLines.showId,
            allocated: sql<number>`coalesce(sum(${budgetLines.allocated}), 0)`,
            committed: sql<number>`coalesce(sum(${budgetLines.committed}), 0)`,
            spent: sql<number>`coalesce(sum(${budgetLines.spent}), 0)`,
          })
          .from(budgetLines)
          .where(inArray(budgetLines.showId, showIds))
          .groupBy(budgetLines.showId),

    showIds.length === 0
      ? []
      : db
          .selectDistinctOn([scheduleCalls.showId], {
            showId: scheduleCalls.showId,
            title: scheduleCalls.title,
            startAt: scheduleCalls.startAt,
          })
          .from(scheduleCalls)
          .where(and(inArray(scheduleCalls.showId, showIds), gt(scheduleCalls.startAt, new Date())))
          .orderBy(scheduleCalls.showId, asc(scheduleCalls.startAt)),

    db
      .select({
        id: activityEntries.id,
        kind: activityEntries.kind,
        text: activityEntries.text,
        departmentName: activityEntries.departmentName,
        createdAt: activityEntries.createdAt,
        showTitle: shows.title,
        authorName: users.name,
      })
      .from(activityEntries)
      .innerJoin(shows, eq(shows.id, activityEntries.showId))
      .innerJoin(users, eq(users.id, activityEntries.authorId))
      .where(eq(activityEntries.organizationId, organizationId))
      .orderBy(desc(activityEntries.createdAt))
      .limit(20),
  ]);

  const budgetByShow = new Map(budgetTotals.map((b) => [b.showId, b]));
  const nextCallByShow = new Map(nextCalls.map((c) => [c.showId, c]));

  const openingSoonCutoff = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);

  const showList = showRows.map((show) => {
    const budget = budgetByShow.get(show.id) ?? { allocated: 0, committed: 0, spent: 0 };
    const next = nextCallByShow.get(show.id) ?? null;
    return { ...show, budget, nextCall: next };
  });

  const openFlagRows = await Promise.all([
    db
      .select({ showId: tasks.showId })
      .from(tasks)
      .where(
        and(eq(tasks.done, false), sql`${tasks.tag} is not null`, inArray(tasks.showId, showIds)),
      ),
    showIds.length === 0
      ? []
      : db
          .select({ showId: meetings.showId })
          .from(meetingActions)
          .innerJoin(meetings, eq(meetings.id, meetingActions.meetingId))
          .where(
            and(
              eq(meetingActions.done, false),
              sql`${meetingActions.tag} is not null`,
              inArray(meetings.showId, showIds),
            ),
          ),
  ]);
  const openFlagShowIds = new Set(openFlagRows.flat().map((r) => r.showId));
  const openFlagCount = openFlagRows.flat().length;

  const metrics = {
    inFlight: showRows.length,
    committed: showList.reduce((sum, s) => sum + Number(s.budget.committed), 0),
    allocated: showList.reduce((sum, s) => sum + Number(s.budget.allocated), 0),
    openingSoon: showRows.filter((s) => s.openDate <= openingSoonCutoff),
    openFlagCount,
    openFlagShowCount: openFlagShowIds.size,
  };

  return { organization: org, shows: showList, metrics, feed: feedRows };
}

/** Show header shared by every tab (the show-detail layout). */
export async function getShowHeader(showId: string) {
  const { organizationId } = await requireMembership();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  const show = await getShowScoped(showId, organizationId);
  if (!show || !org) notFound();
  return { show, currency: org.currency };
}

/** Overview tab: today's calls, key tasks, department status cards. */
export async function getShowOverview(showId: string) {
  const { organizationId } = await requireMembership();
  const show = await getShowScoped(showId, organizationId);
  if (!show) notFound();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [todayCalls, nextCall, taskRows, departmentRows] = await Promise.all([
    db.query.scheduleCalls.findMany({
      where: and(
        eq(scheduleCalls.showId, showId),
        gt(scheduleCalls.startAt, dayStart),
        sql`${scheduleCalls.startAt} < ${dayEnd}`,
      ),
      orderBy: [asc(scheduleCalls.startAt)],
    }),
    db.query.scheduleCalls.findFirst({
      where: and(eq(scheduleCalls.showId, showId), gt(scheduleCalls.startAt, dayEnd)),
      orderBy: [asc(scheduleCalls.startAt)],
    }),
    db.query.tasks.findMany({
      where: eq(tasks.showId, showId),
      orderBy: [asc(tasks.position)],
    }),
    db.query.departments.findMany({
      where: eq(departments.showId, showId),
      orderBy: [asc(departments.createdAt)],
      with: { budgetLines: { columns: { allocated: true, spent: true } } },
    }),
  ]);

  // A department can fund itself from more than one budget line (or none
  // yet) — sum whatever's linked rather than assuming exactly one.
  const departmentsWithBudget = departmentRows.map((d) => ({
    ...d,
    budgetAllocated: d.budgetLines.reduce((sum, b) => sum + b.allocated, 0),
    budgetSpent: d.budgetLines.reduce((sum, b) => sum + b.spent, 0),
  }));

  return { show, todayCalls, nextCall, tasks: taskRows, departments: departmentsWithBudget };
}

export async function getShowSchedule(showId: string) {
  const { organizationId } = await requireMembership();
  const show = await getShowScoped(showId, organizationId);
  if (!show) notFound();

  const calls = await db.query.scheduleCalls.findMany({
    where: eq(scheduleCalls.showId, showId),
    orderBy: [asc(scheduleCalls.startAt)],
  });

  return { show, calls };
}

export async function getShowBudget(showId: string) {
  const { organizationId } = await requireMembership();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  const show = await getShowScoped(showId, organizationId);
  if (!show || !org) notFound();

  const lines = await db.query.budgetLines.findMany({
    where: eq(budgetLines.showId, showId),
    orderBy: [asc(budgetLines.position)],
  });

  const totals = lines.reduce(
    (acc, line) => ({
      allocated: acc.allocated + line.allocated,
      committed: acc.committed + line.committed,
      spent: acc.spent + line.spent,
    }),
    { allocated: 0, committed: 0, spent: 0 },
  );

  return { show, currency: org.currency, lines, totals };
}

export async function getShowDepartments(showId: string, activeName?: string) {
  const { organizationId } = await requireMembership();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });
  const show = await getShowScoped(showId, organizationId);
  if (!show || !org) notFound();

  const list = await db.query.departments.findMany({
    where: eq(departments.showId, showId),
    orderBy: [asc(departments.createdAt)],
  });
  if (list.length === 0) return { show, currency: org.currency, departments: list, active: null };

  // Department names appear in the URL as a slug (see slugify in lib/utils)
  // rather than an exact stored value, so match on the slugified form.
  const active = list.find((d) => slugify(d.name) === activeName) ?? list[0]!;

  const [notes, docs, budget] = await Promise.all([
    db
      .select({
        id: departmentNotes.id,
        body: departmentNotes.body,
        createdAt: departmentNotes.createdAt,
        authorName: users.name,
      })
      .from(departmentNotes)
      .innerJoin(users, eq(users.id, departmentNotes.authorId))
      .where(eq(departmentNotes.departmentId, active.id))
      .orderBy(desc(departmentNotes.createdAt)),

    db.query.departmentDocs.findMany({
      where: eq(departmentDocs.departmentId, active.id),
      orderBy: [desc(departmentDocs.createdAt)],
    }),

    // A department can be funded by more than one budget line; sum them.
    db
      .select({
        allocated: sql<number>`coalesce(sum(${budgetLines.allocated}), 0)`,
        spent: sql<number>`coalesce(sum(${budgetLines.spent}), 0)`,
      })
      .from(budgetLines)
      .where(eq(budgetLines.departmentId, active.id)),
  ]);

  const { allocated: budgetAllocated, spent: budgetSpent } = budget[0] ?? {
    allocated: 0,
    spent: 0,
  };

  return {
    show,
    currency: org.currency,
    departments: list,
    active: { ...active, notes, docs, budgetAllocated, budgetSpent },
  };
}

export async function getShowMeetings(showId: string) {
  const { organizationId } = await requireMembership();
  const show = await getShowScoped(showId, organizationId);
  if (!show) notFound();

  const list = await db.query.meetings.findMany({
    where: eq(meetings.showId, showId),
    orderBy: [desc(meetings.scheduledAt)],
  });

  return { show, meetings: list };
}

/** The meeting a bare `/shows/[id]/meetings` visit should land on. */
export async function getDefaultMeetingId(showId: string) {
  const { meetings: list } = await getShowMeetings(showId);
  if (list.length === 0) return null;
  const issued = list.find((m) => m.status === "minutes_issued");
  return (issued ?? list[0]!).id;
}

export async function getMeetingDetail(showId: string, meetingId: string) {
  const { show, meetings: list } = await getShowMeetings(showId);
  const meeting = list.find((m) => m.id === meetingId);
  if (!meeting) notFound();

  const [minutes, actions] = await Promise.all([
    db.query.meetingMinutes.findMany({
      where: eq(meetingMinutes.meetingId, meeting.id),
      orderBy: [asc(meetingMinutes.position)],
    }),
    db.query.meetingActions.findMany({
      where: eq(meetingActions.meetingId, meeting.id),
      orderBy: [asc(meetingActions.position)],
    }),
  ]);

  return { show, meetings: list, meeting, minutes, actions };
}

export async function getOrganizationMembers() {
  const { organizationId } = await requireMembership();

  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(asc(users.name));
}
