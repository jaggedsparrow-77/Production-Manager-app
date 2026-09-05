import type { Metadata } from "next";
import Link from "next/link";
import { format, isPast } from "date-fns";

import { listMyTasks } from "@/server/queries";
import { taskRef } from "@/lib/utils";
import { PriorityBadge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "My tasks" };

export default async function MyTasksPage() {
  const tasks = await listMyTasks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My tasks</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Open work assigned to you, soonest due first.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing assigned to you.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {tasks.map((task) => {
            const overdue = task.dueDate && isPast(task.dueDate);

            return (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {taskRef(task.projectKey, task.number)}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>

                  <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                    {task.statusName}
                  </span>

                  <PriorityBadge priority={task.priority} />

                  <span
                    className={`w-20 text-right text-xs ${
                      overdue
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {task.dueDate ? format(task.dueDate, "d MMM") : "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
