import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { comments, projectMembers, projects, tasks, taskStatuses, users } from "@/db/schema";
import { getProjectRole, requireUserId } from "./auth-guards";

/**
 * Read side of the app.
 *
 * Each function scopes its query to the caller's membership, so a page cannot
 * leak another workspace's data by passing an id from the URL.
 */

/** Projects the signed-in user belongs to, with rolled-up task counts. */
export async function listProjects() {
  const userId = await requireUserId();

  const doneTasks = sql<number>`count(*) filter (where ${taskStatuses.category} = 'done')`;

  const rows = await db
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      updatedAt: projects.updatedAt,
      role: projectMembers.role,
      totalTasks: count(tasks.id),
      doneTasks,
    })
    .from(projects)
    .innerJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId)),
    )
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .leftJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .groupBy(projects.id, projectMembers.role)
    .orderBy(desc(projects.updatedAt));

  return rows.map((row) => ({
    ...row,
    totalTasks: Number(row.totalTasks),
    doneTasks: Number(row.doneTasks),
  }));
}

/** Full board for one project, or `null` when the user is not a member. */
export async function getProjectBoard(projectId: string) {
  const userId = await requireUserId();
  const role = await getProjectRole(projectId, userId);
  if (!role) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return null;

  const [columns, projectTasks, members] = await Promise.all([
    db.query.taskStatuses.findMany({
      where: eq(taskStatuses.projectId, projectId),
      orderBy: [asc(taskStatuses.position)],
    }),

    db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        description: tasks.description,
        statusId: tasks.statusId,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        position: tasks.position,
        completedAt: tasks.completedAt,
        updatedAt: tasks.updatedAt,
        assigneeId: users.id,
        assigneeName: users.name,
        assigneeImage: users.image,
        commentCount: sql<number>`(
          select count(*) from ${comments} where ${comments.taskId} = ${tasks.id}
        )`,
      })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.assigneeId))
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.position), asc(tasks.number)),

    db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(users.name)),
  ]);

  return {
    project,
    role,
    columns,
    members,
    tasks: projectTasks.map((task) => ({ ...task, commentCount: Number(task.commentCount) })),
  };
}

/** One task with its comment thread, or `null` when out of reach. */
export async function getTaskDetail(taskId: string) {
  const userId = await requireUserId();

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      project: true,
      status: true,
      assignee: true,
      createdBy: true,
    },
  });
  if (!task) return null;

  const role = await getProjectRole(task.projectId, userId);
  if (!role) return null;

  const thread = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.taskId, taskId))
    .orderBy(asc(comments.createdAt));

  return { task, role, comments: thread };
}

/** Tasks assigned to the signed-in user across every project they belong to. */
export async function listMyTasks() {
  const userId = await requireUserId();

  return db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: projects.id,
      projectKey: projects.key,
      projectName: projects.name,
      statusName: taskStatuses.name,
      statusCategory: taskStatuses.category,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(taskStatuses, eq(taskStatuses.id, tasks.statusId))
    .innerJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId)),
    )
    .where(and(eq(tasks.assigneeId, userId), sql`${taskStatuses.category} <> 'done'`))
    .orderBy(asc(tasks.dueDate), asc(tasks.number));
}
