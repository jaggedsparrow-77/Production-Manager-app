import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectBoard } from "@/server/queries";
import { roleAtLeast } from "@/server/auth-guards";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { NewTaskForm } from "./new-task-form";
import { TaskCard } from "./task-card";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const board = await getProjectBoard(id);
  return { title: board?.project.name ?? "Project" };
}

export default async function ProjectBoardPage({ params }: Props) {
  const { id } = await params;
  const board = await getProjectBoard(id);

  // Non-members get a 404 rather than a 403 — existence itself is private.
  if (!board) notFound();

  const { project, role, columns, members, tasks } = board;
  const canEdit = roleAtLeast(role, "member");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {project.key}
            </span>
            {project.status !== "active" && (
              <Badge>{project.status === "on_hold" ? "On hold" : "Archived"}</Badge>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ul className="flex -space-x-1.5" aria-label="Project members">
            {members.map((member) => (
              <li key={member.userId}>
                <Avatar
                  name={member.name ?? member.email}
                  image={member.image}
                  className="ring-2 ring-white dark:ring-slate-950"
                />
              </li>
            ))}
          </ul>

          {canEdit && (
            <NewTaskForm
              projectId={project.id}
              statuses={columns.map(({ id: statusId, name }) => ({ id: statusId, name }))}
              members={members.map((m) => ({ id: m.userId, name: m.name ?? m.email }))}
            />
          )}
        </div>
      </header>

      {columns.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This project has no board columns yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.statusId === column.id);

            return (
              <section key={column.id} className="space-y-3" aria-labelledby={`col-${column.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2
                    id={`col-${column.id}`}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    {column.name}
                  </h2>
                  <span className="text-xs text-slate-400">{columnTasks.length}</span>
                </div>

                <ul className="space-y-2">
                  {columnTasks.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        projectKey={project.key}
                        columns={columns.map((c) => ({ id: c.id, name: c.name }))}
                        canEdit={canEdit}
                      />
                    </li>
                  ))}
                </ul>

                {columnTasks.length === 0 && (
                  <p className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
                    Nothing here
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Your role on this project: {role}.{" "}
        {!canEdit && <Link href="/projects">Read-only access.</Link>}
      </p>
    </div>
  );
}
