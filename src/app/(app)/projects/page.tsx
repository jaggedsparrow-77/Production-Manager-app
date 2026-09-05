import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { listProjects } from "@/server/queries";
import { completionPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { NewProjectForm } from "./new-project-form";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {projects.length === 0
              ? "You are not a member of any project yet."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <NewProjectForm />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const percent = completionPercent(project.doneTasks, project.totalTasks);

            return (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block h-full rounded-lg border border-slate-200 p-5 transition-colors hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {project.key}
                    </span>
                    {project.status !== "active" && (
                      <Badge>{project.status === "on_hold" ? "On hold" : "Archived"}</Badge>
                    )}
                  </div>

                  <h2 className="mt-2 font-medium">{project.name}</h2>

                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${project.name} completion`}
                    >
                      <div
                        className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {project.doneTasks} of {project.totalTasks} done · updated{" "}
                      {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
