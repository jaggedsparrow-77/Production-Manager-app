"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { comments, projectMembers, projects, tasks, taskStatuses, users } from "@/db/schema";
import { DEFAULT_STATUSES } from "@/lib/constants";
import {
  addMemberSchema,
  createCommentSchema,
  createProjectSchema,
  createTaskSchema,
  moveTaskSchema,
  updateProjectSchema,
  updateTaskSchema,
} from "@/lib/validation";
import { AuthorizationError, requireProjectRole, requireUserId } from "./auth-guards";

/**
 * Mutations.
 *
 * Contract for every action in this file:
 *   1. Parse FormData through a zod schema — never trust the client.
 *   2. Authorize against the caller's project role.
 *   3. Mutate, then revalidate the affected paths.
 *
 * Actions return `ActionState` instead of throwing so forms can render the
 * error inline via `useActionState`.
 */

export type ActionState = {
  ok: boolean;
  message?: string;
  /** Field-level messages keyed by input name. */
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

/** Wraps an action body so expected failures become form state, not crashes. */
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
 * Projects
 * ---------------------------------------------------------------------- */

export async function createProject(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    key: formData.get("key"),
    description: formData.get("description"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);

  const { name, key, description } = parsed.data;

  const existing = await db.query.projects.findFirst({
    where: sql`upper(${projects.key}) = ${key}`,
    columns: { id: true },
  });
  if (existing) {
    return { ok: false, errors: { key: ["That project key is already taken."] } };
  }

  // One transaction so a project can never exist without its board columns
  // or its owner membership.
  const projectId = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({ name, key, description: description || null, ownerId: userId })
      .returning({ id: projects.id });

    if (!project) throw new Error("Failed to create project");

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId,
      role: "owner",
    });

    await tx.insert(taskStatuses).values(
      DEFAULT_STATUSES.map((status, index) => ({
        projectId: project.id,
        name: status.name,
        category: status.category,
        position: index,
        isDefault: index === 0,
      })),
    );

    return project.id;
  });

  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function updateProject(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const parsed = updateProjectSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      description: formData.get("description"),
      status: formData.get("status"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { id, name, description, status } = parsed.data;
    await requireProjectRole(id, "admin");

    await db
      .update(projects)
      .set({
        name,
        description: description || null,
        status,
        archivedAt: status === "archived" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id));

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return OK;
  });
}

export async function addProjectMember(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const parsed = addMemberSchema.safeParse({
      projectId: formData.get("projectId"),
      email: formData.get("email"),
      role: formData.get("role") || undefined,
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { projectId, email, role } = parsed.data;
    await requireProjectRole(projectId, "admin");

    const invitee = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (!invitee) {
      return { ok: false, errors: { email: ["No user with that email address."] } };
    }

    await db
      .insert(projectMembers)
      .values({ projectId, userId: invitee.id, role })
      .onConflictDoUpdate({
        target: [projectMembers.projectId, projectMembers.userId],
        set: { role },
      });

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, message: `${email} added to the project.` };
  });
}

/* -------------------------------------------------------------------------
 * Tasks
 * ---------------------------------------------------------------------- */

export async function createTask(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const parsed = createTaskSchema.safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      description: formData.get("description"),
      statusId: formData.get("statusId"),
      assigneeId: formData.get("assigneeId"),
      priority: formData.get("priority") || undefined,
      dueDate: formData.get("dueDate"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const input = parsed.data;
    const { userId } = await requireProjectRole(input.projectId, "member");

    await db.transaction(async (tx) => {
      // Bump the counter inside the transaction so two concurrent creates
      // cannot claim the same task number.
      const [project] = await tx
        .update(projects)
        .set({ taskCounter: sql`${projects.taskCounter} + 1`, updatedAt: new Date() })
        .where(eq(projects.id, input.projectId))
        .returning({ number: projects.taskCounter });

      if (!project) throw new Error("Project not found");

      // Confirm the status belongs to this project — the id came from a form.
      const status = await tx.query.taskStatuses.findFirst({
        where: and(
          eq(taskStatuses.id, input.statusId),
          eq(taskStatuses.projectId, input.projectId),
        ),
        columns: { id: true },
      });
      if (!status) throw new AuthorizationError("That status does not belong to this project.");

      const [{ next } = { next: 0 }] = await tx
        .select({ next: sql<number>`coalesce(max(${tasks.position}), 0) + 1` })
        .from(tasks)
        .where(eq(tasks.statusId, input.statusId));

      await tx.insert(tasks).values({
        projectId: input.projectId,
        number: project.number,
        title: input.title,
        description: input.description || null,
        statusId: input.statusId,
        assigneeId: input.assigneeId,
        createdById: userId,
        priority: input.priority,
        dueDate: input.dueDate,
        position: Number(next),
      });
    });

    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true, message: "Task created." };
  });
}

export async function updateTask(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const parsed = updateTaskSchema.safeParse({
      id: formData.get("id"),
      title: formData.get("title"),
      description: formData.get("description"),
      statusId: formData.get("statusId"),
      assigneeId: formData.get("assigneeId"),
      priority: formData.get("priority"),
      dueDate: formData.get("dueDate"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const input = parsed.data;

    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, input.id),
      columns: { projectId: true },
    });
    if (!existing) return { ok: false, message: "Task not found." };

    await requireProjectRole(existing.projectId, "member");

    const status = await db.query.taskStatuses.findFirst({
      where: and(
        eq(taskStatuses.id, input.statusId),
        eq(taskStatuses.projectId, existing.projectId),
      ),
      columns: { category: true },
    });
    if (!status) return { ok: false, message: "That status does not belong to this project." };

    await db
      .update(tasks)
      .set({
        title: input.title,
        description: input.description || null,
        statusId: input.statusId,
        assigneeId: input.assigneeId,
        priority: input.priority,
        dueDate: input.dueDate,
        completedAt: status.category === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, input.id));

    revalidatePath(`/projects/${existing.projectId}`);
    revalidatePath(`/tasks/${input.id}`);
    return { ok: true, message: "Task updated." };
  });
}

/** Column-to-column move, used by the board's status buttons. */
export async function moveTask(formData: FormData): Promise<ActionState> {
  return run(async () => {
    const parsed = moveTaskSchema.safeParse({
      id: formData.get("id"),
      statusId: formData.get("statusId"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { id, statusId } = parsed.data;

    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      columns: { projectId: true },
    });
    if (!existing) return { ok: false, message: "Task not found." };

    await requireProjectRole(existing.projectId, "member");

    const status = await db.query.taskStatuses.findFirst({
      where: and(eq(taskStatuses.id, statusId), eq(taskStatuses.projectId, existing.projectId)),
      columns: { category: true },
    });
    if (!status) return { ok: false, message: "That status does not belong to this project." };

    await db
      .update(tasks)
      .set({
        statusId,
        completedAt: status.category === "done" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    revalidatePath(`/projects/${existing.projectId}`);
    revalidatePath(`/tasks/${id}`);
    return OK;
  });
}

export async function deleteTask(formData: FormData): Promise<ActionState> {
  return run(async () => {
    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, message: "Invalid task." };

    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, id.data),
      columns: { projectId: true },
    });
    if (!existing) return { ok: false, message: "Task not found." };

    await requireProjectRole(existing.projectId, "member");
    await db.delete(tasks).where(eq(tasks.id, id.data));

    revalidatePath(`/projects/${existing.projectId}`);
    redirect(`/projects/${existing.projectId}`);
  });
}

/* -------------------------------------------------------------------------
 * Comments
 * ---------------------------------------------------------------------- */

export async function createComment(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    const parsed = createCommentSchema.safeParse({
      taskId: formData.get("taskId"),
      body: formData.get("body"),
    });
    if (!parsed.success) return fieldErrors(parsed.error);

    const { taskId, body } = parsed.data;

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      columns: { projectId: true },
    });
    if (!task) return { ok: false, message: "Task not found." };

    const { userId } = await requireProjectRole(task.projectId, "member");

    await db.insert(comments).values({ taskId, authorId: userId, body });

    revalidatePath(`/tasks/${taskId}`);
    return OK;
  });
}
