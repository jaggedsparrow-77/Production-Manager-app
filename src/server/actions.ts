"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  activityEntries,
  departmentNotes,
  departments,
  meetingActions,
  meetings,
  organizationMembers,
  shows,
  tasks,
  users,
} from "@/db/schema";
import {
  addDepartmentNoteSchema,
  addMeetingActionSchema,
  addOrganizationMemberSchema,
  addTaskSchema,
  createShowSchema,
  logDecisionSchema,
  toggleMeetingActionSchema,
  toggleTaskSchema,
} from "@/lib/validation";
import { AuthorizationError, requireOrgRole } from "./auth-guards";

/**
 * Mutations. Every action: parse FormData with zod → authorize via
 * requireOrgRole → mutate → revalidate. Actions return `ActionState` instead
 * of throwing so forms can render the error inline via `useActionState`.
 */

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: ActionState = { ok: true };

function fieldErrors(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: "Please fix the highlighted fields.",
    errors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

async function run(body: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: error.message };
    }
    // `redirect()` throws by design — let Next.js handle its own control flow.
    throw error;
  }
}

/* -------------------------------------------------------------------------
 * Shows
 * ---------------------------------------------------------------------- */

export async function createShow(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const { organizationId } = await requireOrgRole("admin");

  const parsed = createShowSchema.safeParse({
    title: formData.get("title"),
    venue: formData.get("venue"),
    openDate: formData.get("openDate"),
    closeDate: formData.get("closeDate"),
    phase: formData.get("phase"),
    director: formData.get("director"),
    designer: formData.get("designer"),
    companySize: formData.get("companySize"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const input = parsed.data;
  if (new Date(input.closeDate) < new Date(input.openDate)) {
    return { ok: false, errors: { closeDate: ["Close date must be on or after the open date."] } };
  }

  const [show] = await db
    .insert(shows)
    .values({
      organizationId,
      title: input.title,
      venue: input.venue,
      openDate: new Date(input.openDate),
      closeDate: new Date(input.closeDate),
      phase: input.phase,
      director: input.director || null,
      designer: input.designer || null,
      companySize: input.companySize === "" ? null : input.companySize,
    })
    .returning({ id: shows.id });

  if (!show) throw new Error("Failed to create show");

  revalidatePath("/shows");
  redirect(`/shows/${show.id}`);
}

/* -------------------------------------------------------------------------
 * Decision log / activity
 * ---------------------------------------------------------------------- */

export async function logDecision(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { userId, organizationId } = await requireOrgRole("member");

    const parsed = logDecisionSchema.safeParse({
      showId: formData.get("showId"),
      department: formData.get("department"),
      text: formData.get("text"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { showId, department, text } = parsed.data;

    const show = await db.query.shows.findFirst({
      where: and(eq(shows.id, showId), eq(shows.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!show) return { ok: false, message: "Show not found." };

    await db.insert(activityEntries).values({
      organizationId,
      showId,
      departmentName: department,
      kind: "decision",
      text,
      authorId: userId,
    });

    revalidatePath("/shows");
    revalidatePath(`/shows/${showId}`);
    return { ok: true, message: "Decision logged." };
  });
}

/* -------------------------------------------------------------------------
 * Departments
 * ---------------------------------------------------------------------- */

export async function addDepartmentNote(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { userId, organizationId } = await requireOrgRole("member");

    const parsed = addDepartmentNoteSchema.safeParse({
      departmentId: formData.get("departmentId"),
      body: formData.get("body"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { departmentId, body } = parsed.data;

    const department = await db.query.departments.findFirst({
      where: eq(departments.id, departmentId),
      with: { show: { columns: { id: true, organizationId: true } } },
    });
    if (!department || department.show.organizationId !== organizationId) {
      return { ok: false, message: "Department not found." };
    }

    await db.insert(departmentNotes).values({ departmentId, authorId: userId, body });

    revalidatePath(`/shows/${department.show.id}/departments`);
    return OK;
  });
}

/* -------------------------------------------------------------------------
 * Tasks
 * ---------------------------------------------------------------------- */

export async function addTask(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { organizationId } = await requireOrgRole("member");

    const parsed = addTaskSchema.safeParse({
      showId: formData.get("showId"),
      label: formData.get("label"),
      ownerName: formData.get("ownerName"),
      dueDate: formData.get("dueDate"),
      tag: formData.get("tag"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { showId, label, ownerName, dueDate, tag } = parsed.data;

    const show = await db.query.shows.findFirst({
      where: and(eq(shows.id, showId), eq(shows.organizationId, organizationId)),
      columns: { id: true },
    });
    if (!show) return { ok: false, message: "Show not found." };

    const [{ next } = { next: 0 }] = await db
      .select({ next: sql<number>`coalesce(max(${tasks.position}), 0) + 1` })
      .from(tasks)
      .where(eq(tasks.showId, showId));

    await db.insert(tasks).values({
      showId,
      label,
      ownerName,
      dueDate,
      tag,
      position: Number(next),
    });

    revalidatePath(`/shows/${showId}`);
    return OK;
  });
}

export async function toggleTask(formData: FormData): Promise<ActionState> {
  return run(async () => {
    const { organizationId } = await requireOrgRole("member");

    const parsed = toggleTaskSchema.safeParse({
      id: formData.get("id"),
      done: formData.get("done"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { id, done } = parsed.data;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: { show: { columns: { id: true, organizationId: true } } },
    });
    if (!task || task.show.organizationId !== organizationId) {
      return { ok: false, message: "Task not found." };
    }

    await db
      .update(tasks)
      .set({ done, doneAt: done ? new Date() : null })
      .where(eq(tasks.id, id));

    revalidatePath(`/shows/${task.show.id}`);
    return OK;
  });
}

/* -------------------------------------------------------------------------
 * Meeting actions
 * ---------------------------------------------------------------------- */

export async function addMeetingAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { organizationId } = await requireOrgRole("member");

    const parsed = addMeetingActionSchema.safeParse({
      meetingId: formData.get("meetingId"),
      text: formData.get("text"),
      ownerName: formData.get("ownerName"),
      dueDate: formData.get("dueDate"),
      tag: formData.get("tag"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { meetingId, text, ownerName, dueDate, tag } = parsed.data;

    const meeting = await db.query.meetings.findFirst({
      where: eq(meetings.id, meetingId),
      with: { show: { columns: { id: true, organizationId: true } } },
    });
    if (!meeting || meeting.show.organizationId !== organizationId) {
      return { ok: false, message: "Meeting not found." };
    }

    const [{ next } = { next: 0 }] = await db
      .select({ next: sql<number>`coalesce(max(${meetingActions.position}), 0) + 1` })
      .from(meetingActions)
      .where(eq(meetingActions.meetingId, meetingId));

    await db.insert(meetingActions).values({
      meetingId,
      text,
      ownerName,
      dueDate,
      tag,
      position: Number(next),
    });

    revalidatePath(`/shows/${meeting.show.id}/meetings/${meetingId}`);
    return OK;
  });
}

export async function toggleMeetingAction(formData: FormData): Promise<ActionState> {
  return run(async () => {
    const { organizationId } = await requireOrgRole("member");

    const parsed = toggleMeetingActionSchema.safeParse({
      id: formData.get("id"),
      done: formData.get("done"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { id, done } = parsed.data;

    const action = await db.query.meetingActions.findFirst({
      where: eq(meetingActions.id, id),
      with: { meeting: { with: { show: { columns: { id: true, organizationId: true } } } } },
    });
    if (!action || action.meeting.show.organizationId !== organizationId) {
      return { ok: false, message: "Action not found." };
    }

    await db
      .update(meetingActions)
      .set({ done, doneAt: done ? new Date() : null })
      .where(eq(meetingActions.id, id));

    revalidatePath(`/shows/${action.meeting.show.id}/meetings/${action.meetingId}`);
    return OK;
  });
}

/* -------------------------------------------------------------------------
 * Organization members
 * ---------------------------------------------------------------------- */

export async function addOrganizationMember(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { organizationId } = await requireOrgRole("admin");

    const parsed = addOrganizationMemberSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role") || undefined,
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { email, role } = parsed.data;

    const invitee = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (!invitee) {
      return { ok: false, errors: { email: ["No user with that email address."] } };
    }

    await db
      .insert(organizationMembers)
      .values({ organizationId, userId: invitee.id, role })
      .onConflictDoUpdate({
        target: [organizationMembers.organizationId, organizationMembers.userId],
        set: { role },
      });

    revalidatePath("/company");
    return { ok: true, message: `${email} added.` };
  });
}
