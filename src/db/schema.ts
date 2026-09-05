import {
  boolean,
  date,
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
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

/**
 * Callboard's domain: a theatre company runs several shows at once, each with
 * departments, a production schedule, production meetings (minutes + actions),
 * a budget, and a running feed of decisions. One organization per deployed
 * instance — every signed-in user is a member of the one company running it,
 * with a role, and sees every show. See docs/adr/0004-callboard-domain.md.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* -------------------------------------------------------------------------
 * Auth.js tables — shapes dictated by @auth/drizzle-adapter, do not rename.
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
 * Enums
 * ---------------------------------------------------------------------- */

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member", "viewer"]);

/** Traffic-light status used for shows and departments. */
export const healthStateEnum = pgEnum("health_state", ["ok", "warn", "risk"]);

export const meetingStatusEnum = pgEnum("meeting_status", ["scheduled", "minutes_issued"]);

/** Flag on a task or meeting action. Null (no column value) means unflagged. */
export const flagTagEnum = pgEnum("flag_tag", ["at_risk", "urgent", "carried_forward"]);

export const activityKindEnum = pgEnum("activity_kind", ["decision", "update", "budget"]);

/* -------------------------------------------------------------------------
 * Organization — one theatre company per deployed instance.
 * ---------------------------------------------------------------------- */

export const organizations = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Currency symbol used throughout, e.g. "£". */
  currency: text("currency").notNull().default("£"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_member",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_member_user_idx").on(table.userId),
  ],
);

/* -------------------------------------------------------------------------
 * Shows
 * ---------------------------------------------------------------------- */

export const shows = pgTable(
  "show",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    venue: text("venue").notNull(),
    openDate: date("open_date", { mode: "date" }).notNull(),
    closeDate: date("close_date", { mode: "date" }).notNull(),
    /** Free text: "Pre-production", "Build", "Production week", ... */
    phase: text("phase").notNull(),
    state: healthStateEnum("state").notNull().default("ok"),
    director: text("director"),
    designer: text("designer"),
    companySize: integer("company_size"),
    /**
     * Manually-maintained one-line flag summary, e.g. "2 flags · AV spec, RF
     * mics" — a producer's own gloss, not derived from the flagged
     * tasks/actions below (those can span departments in ways a single count
     * doesn't capture well). Budget totals, by contrast, ARE derived — see
     * getShowPortfolio in server/queries.ts.
     */
    flagsSummary: text("flags_summary"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("show_organization_idx").on(table.organizationId),
    index("show_open_date_idx").on(table.openDate),
  ],
);

/* -------------------------------------------------------------------------
 * Departments
 *
 * No budget columns here on purpose: a department's spend is its matching
 * `budgetLine` row (joined by name at read time, in server/queries.ts), not
 * a second copy of the same figure. Some budget lines — Contingency, Crew &
 * overtime — have no matching department at all, which is exactly why the
 * two stay separate tables instead of collapsing one into the other.
 * ---------------------------------------------------------------------- */

export const departments = pgTable(
  "department",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    headName: text("head_name").notNull(),
    secondName: text("second_name"),
    /** Free text label shown next to the status dot, e.g. "Needs attention". */
    status: text("status").notNull(),
    state: healthStateEnum("state").notNull().default("ok"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("department_show_name_unique").on(table.showId, table.name),
    index("department_show_idx").on(table.showId),
  ],
);

export const departmentNotes = pgTable(
  "department_note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("department_note_department_idx").on(table.departmentId, table.createdAt)],
);

export const departmentDocs = pgTable(
  "department_doc",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** File extension shown as a tag: PDF, DWG, XLSX, MD, ... */
    ext: text("ext").notNull(),
    sizeLabel: text("size_label"),
    /** Null means "awaiting upload" — listed but not yet delivered. */
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("department_doc_department_idx").on(table.departmentId)],
);

/* -------------------------------------------------------------------------
 * Budget
 * ---------------------------------------------------------------------- */

export const budgetLines = pgTable(
  "budget_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /**
     * Which department this line funds, when it funds exactly one — null
     * for lines with no department behind them (Contingency, Crew &
     * overtime). An explicit FK rather than matching on name: a budget
     * line's display name doesn't have to equal its department's ("AV &
     * video" funds the "AV" department), so the link needs to be a real
     * relationship, not a string comparison.
     */
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    allocated: integer("allocated").notNull().default(0),
    committed: integer("committed").notNull().default(0),
    spent: integer("spent").notNull().default(0),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    uniqueIndex("budget_line_show_name_unique").on(table.showId, table.name),
    index("budget_line_show_idx").on(table.showId, table.position),
    index("budget_line_department_idx").on(table.departmentId),
  ],
);

/* -------------------------------------------------------------------------
 * Production schedule
 * ---------------------------------------------------------------------- */

export const scheduleCalls = pgTable(
  "schedule_call",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    /** Null for calls with no scheduled end, e.g. "Curtain 19:30". */
    endAt: timestamp("end_at", { withTimezone: true }),
    location: text("location").notNull(),
    /** Free-text department summary, e.g. "Staging, Lighting" or "All departments". */
    departmentsLabel: text("departments_label").notNull(),
    note: text("note"),
  },
  (table) => [index("schedule_call_show_start_idx").on(table.showId, table.startAt)],
);

/* -------------------------------------------------------------------------
 * Key tasks (per show)
 * ---------------------------------------------------------------------- */

export const tasks = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    ownerName: text("owner_name").notNull(),
    dueDate: date("due_date", { mode: "date" }),
    tag: flagTagEnum("tag"),
    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_show_idx").on(table.showId, table.position)],
);

/* -------------------------------------------------------------------------
 * Production meetings
 * ---------------------------------------------------------------------- */

export const meetings = pgTable(
  "meeting",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    /** Short reference shown in the meetings list, e.g. "PM 6". */
    ref: text("ref").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    location: text("location").notNull(),
    chairName: text("chair_name").notNull(),
    minuteTakerName: text("minute_taker_name"),
    status: meetingStatusEnum("status").notNull().default("scheduled"),
    presentSummary: text("present_summary"),
    apologiesSummary: text("apologies_summary"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("meeting_show_ref_unique").on(table.showId, table.ref),
    index("meeting_show_scheduled_idx").on(table.showId, table.scheduledAt),
  ],
);

export const meetingMinutes = pgTable(
  "meeting_minute",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    item: text("item").notNull(),
    note: text("note").notNull(),
    decision: text("decision"),
  },
  (table) => [index("meeting_minute_meeting_idx").on(table.meetingId, table.position)],
);

export const meetingActions = pgTable(
  "meeting_action",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    ownerName: text("owner_name").notNull(),
    dueDate: date("due_date", { mode: "date" }),
    tag: flagTagEnum("tag"),
    done: boolean("done").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("meeting_action_meeting_idx").on(table.meetingId, table.position)],
);

/* -------------------------------------------------------------------------
 * Activity feed / decision log
 * ---------------------------------------------------------------------- */

export const activityEntries = pgTable(
  "activity_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    showId: uuid("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),
    /** Free text — the decision-log dialog offers a fixed list, but this
     *  stays a plain column rather than a department FK, since not every
     *  show necessarily has a department row by that name. */
    departmentName: text("department_name"),
    kind: activityKindEnum("kind").notNull(),
    text: text("text").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activity_entry_organization_idx").on(table.organizationId, table.createdAt)],
);

/* -------------------------------------------------------------------------
 * Relations
 * ---------------------------------------------------------------------- */

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  shows: many(shows),
  activity: many(activityEntries),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const showsRelations = relations(shows, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [shows.organizationId],
    references: [organizations.id],
  }),
  departments: many(departments),
  budgetLines: many(budgetLines),
  scheduleCalls: many(scheduleCalls),
  tasks: many(tasks),
  meetings: many(meetings),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  show: one(shows, { fields: [departments.showId], references: [shows.id] }),
  notes: many(departmentNotes),
  docs: many(departmentDocs),
  budgetLines: many(budgetLines),
}));

export const departmentNotesRelations = relations(departmentNotes, ({ one }) => ({
  department: one(departments, {
    fields: [departmentNotes.departmentId],
    references: [departments.id],
  }),
  author: one(users, { fields: [departmentNotes.authorId], references: [users.id] }),
}));

export const departmentDocsRelations = relations(departmentDocs, ({ one }) => ({
  department: one(departments, {
    fields: [departmentDocs.departmentId],
    references: [departments.id],
  }),
}));

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  show: one(shows, { fields: [budgetLines.showId], references: [shows.id] }),
  department: one(departments, {
    fields: [budgetLines.departmentId],
    references: [departments.id],
  }),
}));

export const scheduleCallsRelations = relations(scheduleCalls, ({ one }) => ({
  show: one(shows, { fields: [scheduleCalls.showId], references: [shows.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  show: one(shows, { fields: [tasks.showId], references: [shows.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  show: one(shows, { fields: [meetings.showId], references: [shows.id] }),
  minutes: many(meetingMinutes),
  actions: many(meetingActions),
}));

export const meetingMinutesRelations = relations(meetingMinutes, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingMinutes.meetingId], references: [meetings.id] }),
}));

export const meetingActionsRelations = relations(meetingActions, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingActions.meetingId], references: [meetings.id] }),
}));

export const activityEntriesRelations = relations(activityEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityEntries.organizationId],
    references: [organizations.id],
  }),
  show: one(shows, { fields: [activityEntries.showId], references: [shows.id] }),
  author: one(users, { fields: [activityEntries.authorId], references: [users.id] }),
}));

/* -------------------------------------------------------------------------
 * Inferred types
 * ---------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Show = typeof shows.$inferSelect;
export type NewShow = typeof shows.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type DepartmentNote = typeof departmentNotes.$inferSelect;
export type DepartmentDoc = typeof departmentDocs.$inferSelect;
export type BudgetLine = typeof budgetLines.$inferSelect;
export type ScheduleCall = typeof scheduleCalls.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type MeetingMinute = typeof meetingMinutes.$inferSelect;
export type MeetingAction = typeof meetingActions.$inferSelect;
export type ActivityEntry = typeof activityEntries.$inferSelect;

export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type HealthState = (typeof healthStateEnum.enumValues)[number];
export type MeetingStatus = (typeof meetingStatusEnum.enumValues)[number];
export type FlagTag = (typeof flagTagEnum.enumValues)[number];
export type ActivityKind = (typeof activityKindEnum.enumValues)[number];
