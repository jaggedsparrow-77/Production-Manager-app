/**
 * Seeds a realistic development dataset.
 *
 * Idempotent: it clears the domain tables first, so `npm run db:seed` can be
 * re-run at any time. It refuses to touch a production database.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";

import * as schema from "./schema";
import { loadEnvLocal } from "./load-env";
import { DEFAULT_STATUSES } from "@/lib/constants";

loadEnvLocal();

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production database.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);

async function seed() {
  console.log("Clearing existing data…");
  // CASCADE handles the dependent domain tables; users are truncated too so
  // seeded accounts keep stable identities across runs.
  await db.execute(
    sql`truncate table "comment", "task", "task_status", "project_member", "project", "session", "account", "user" restart identity cascade`,
  );

  console.log("Creating users…");
  const people = await db
    .insert(schema.users)
    .values([
      { name: "Ada Lovelace", email: "ada@example.com" },
      { name: "Grace Hopper", email: "grace@example.com" },
      { name: "Alan Turing", email: "alan@example.com" },
    ])
    .returning();

  const [ada, grace, alan] = people;
  if (!ada || !grace || !alan) throw new Error("Seed users were not created");

  console.log("Creating projects…");
  const [website, platform] = await db
    .insert(schema.projects)
    .values([
      {
        key: "WEB",
        name: "Website Relaunch",
        description: "Rebuild the marketing site on the new design system.",
        ownerId: ada.id,
      },
      {
        key: "PLAT",
        name: "Platform Reliability",
        description: "Reduce p99 latency and eliminate the top five error classes.",
        ownerId: grace.id,
      },
    ])
    .returning();

  if (!website || !platform) throw new Error("Seed projects were not created");

  await db.insert(schema.projectMembers).values([
    { projectId: website.id, userId: ada.id, role: "owner" },
    { projectId: website.id, userId: grace.id, role: "member" },
    { projectId: website.id, userId: alan.id, role: "member" },
    { projectId: platform.id, userId: grace.id, role: "owner" },
    { projectId: platform.id, userId: alan.id, role: "admin" },
  ]);

  console.log("Creating board columns…");
  const statuses = await db
    .insert(schema.taskStatuses)
    .values(
      [website, platform].flatMap((project) =>
        DEFAULT_STATUSES.map((status, index) => ({
          projectId: project.id,
          name: status.name,
          category: status.category,
          position: index,
          isDefault: index === 0,
        })),
      ),
    )
    .returning();

  const statusFor = (projectId: string, name: string) => {
    const match = statuses.find((s) => s.projectId === projectId && s.name === name);
    if (!match) throw new Error(`Missing status "${name}"`);
    return match.id;
  };

  console.log("Creating tasks…");
  const seededTasks = [
    {
      projectId: website.id,
      title: "Audit current page inventory",
      description: "Catalogue every live URL and mark keep / merge / retire.",
      status: "Done",
      assigneeId: grace.id,
      priority: "medium" as const,
      completed: true,
    },
    {
      projectId: website.id,
      title: "Design system tokens for typography",
      description: "Define the type scale and line-height ramp.",
      status: "In Progress",
      assigneeId: ada.id,
      priority: "high" as const,
      dueDate: daysFromNow(5),
    },
    {
      projectId: website.id,
      title: "Migrate pricing page",
      status: "In Review",
      assigneeId: alan.id,
      priority: "high" as const,
      dueDate: daysFromNow(2),
    },
    {
      projectId: website.id,
      title: "Set up preview deployments",
      status: "Backlog",
      assigneeId: null,
      priority: "low" as const,
    },
    {
      projectId: platform.id,
      title: "Add p99 latency dashboard",
      description: "Per-endpoint latency with alerting above 800ms.",
      status: "In Progress",
      assigneeId: grace.id,
      priority: "urgent" as const,
      dueDate: daysFromNow(1),
    },
    {
      projectId: platform.id,
      title: "Retry policy for the payments webhook",
      status: "Backlog",
      assigneeId: alan.id,
      priority: "high" as const,
    },
    {
      projectId: platform.id,
      title: "Upgrade Postgres to 18",
      status: "Backlog",
      assigneeId: null,
      priority: "medium" as const,
    },
  ];

  const counters = new Map<string, number>();
  const positions = new Map<string, number>();

  for (const task of seededTasks) {
    const number = (counters.get(task.projectId) ?? 0) + 1;
    counters.set(task.projectId, number);

    const statusId = statusFor(task.projectId, task.status);
    const position = (positions.get(statusId) ?? 0) + 1;
    positions.set(statusId, position);

    const [created] = await db
      .insert(schema.tasks)
      .values({
        projectId: task.projectId,
        number,
        title: task.title,
        description: task.description ?? null,
        statusId,
        assigneeId: task.assigneeId ?? null,
        createdById: ada.id,
        priority: task.priority,
        dueDate: task.dueDate ?? null,
        position,
        completedAt: task.completed ? new Date() : null,
      })
      .returning();

    if (created && task.title.startsWith("Design system")) {
      await db.insert(schema.comments).values([
        {
          taskId: created.id,
          authorId: grace.id,
          body: "Should the scale be modular or hand-tuned per breakpoint?",
        },
        {
          taskId: created.id,
          authorId: ada.id,
          body: "Modular at 1.25, with a hand-tuned override for display sizes.",
        },
      ]);
    }
  }

  for (const [projectId, count] of counters) {
    await db
      .update(schema.projects)
      .set({ taskCounter: count })
      .where(eq(schema.projects.id, projectId));
  }

  console.log(
    `Seeded ${people.length} users, 2 projects and ${seededTasks.length} tasks.\n` +
      `Sign in at http://localhost:3000/login as ada@example.com`,
  );
}

try {
  await seed();
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
