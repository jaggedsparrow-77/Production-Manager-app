import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

/* -------------------------------------------------------------------------
 * Shared column helpers
 * ---------------------------------------------------------------------- */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* -------------------------------------------------------------------------
 * Auth.js tables
 *
 * Shapes are dictated by @auth/drizzle-adapter — do not rename these columns.
 * ---------------------------------------------------------------------- */

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

/* -------------------------------------------------------------------------
 * Domain enums
 * ---------------------------------------------------------------------- */

export const projectStatusEnum = pgEnum("project_status", ["active", "on_hold", "archived"]);

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member", "viewer"]);

/**
 * Where a status sits in the workflow. Board columns are user-defined and
 * reorderable, but reporting needs to know "is this done?" without string
 * matching on a name the user can rename at will.
 */
export const statusCategoryEnum = pgEnum("status_category", ["backlog", "active", "done"]);

export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);

/* -------------------------------------------------------------------------
 * Projects
 * ---------------------------------------------------------------------- */

export const projects = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short uppercase prefix used in task references, e.g. "PM" in PM-42. */
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("active"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Monotonic counter backing per-project task numbers. */
    taskCounter: integer("task_counter").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("project_key_unique").on(sql`upper(${table.key})`),
    index("project_status_idx").on(table.status),
  ],
);

export const projectMembers = pgTable(
  "project_member",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("project_member_user_idx").on(table.userId),
  ],
);

/* -------------------------------------------------------------------------
 * Task statuses (board columns)
 * ---------------------------------------------------------------------- */

export const taskStatuses = pgTable(
  "task_status",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: statusCategoryEnum("category").notNull().default("active"),
    /** Left-to-right board order. Sparse so inserts rarely renumber siblings. */
    position: integer("position").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_status_project_name_unique").on(table.projectId, table.name),
    index("task_status_project_position_idx").on(table.projectId, table.position),
  ],
);

/* -------------------------------------------------------------------------
 * Tasks
 * ---------------------------------------------------------------------- */

export const tasks = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Per-project sequence number; combined with project.key gives "PM-42". */
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    statusId: uuid("status_id")
      .notNull()
      .references(() => taskStatuses.id, { onDelete: "restrict" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    /** Vertical order within a status column. */
    position: integer("position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("task_project_number_unique").on(table.projectId, table.number),
    index("task_status_idx").on(table.statusId, table.position),
    index("task_assignee_idx").on(table.assigneeId),
    index("task_project_idx").on(table.projectId),
  ],
);

/* -------------------------------------------------------------------------
 * Comments
 * ---------------------------------------------------------------------- */

export const comments = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    ...timestamps,
  },
  (table) => [index("comment_task_idx").on(table.taskId, table.createdAt)],
);

/* -------------------------------------------------------------------------
 * Relations (for drizzle's relational query API)
 * ---------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(projectMembers),
  assignedTasks: many(tasks),
  comments: many(comments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  members: many(projectMembers),
  statuses: many(taskStatuses),
  tasks: many(tasks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const taskStatusesRelations = relations(taskStatuses, ({ one, many }) => ({
  project: one(projects, { fields: [taskStatuses.projectId], references: [projects.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  status: one(taskStatuses, { fields: [tasks.statusId], references: [taskStatuses.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id] }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

/* -------------------------------------------------------------------------
 * Inferred types — import these instead of hand-writing row shapes.
 * ---------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type TaskStatus = typeof taskStatuses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Comment = typeof comments.$inferSelect;

export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type StatusCategory = (typeof statusCategoryEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
