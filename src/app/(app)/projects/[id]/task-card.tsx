import Link from "next/link";
import { format, isPast } from "date-fns";
import { CalendarDays, MessageSquare } from "lucide-react";

import { moveTask } from "@/server/actions";
import { taskRef } from "@/lib/utils";
import type { TaskPriority } from "@/db/schema";
import { PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

type BoardTask = {
  id: string;
  number: number;
  title: string;
  statusId: string;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  commentCount: number;
  assigneeName: string | null;
  assigneeImage: string | null;
};

export function TaskCard({
  task,
  projectKey,
  columns,
  canEdit,
}: {
  task: BoardTask;
  projectKey: string;
  columns: Array<{ id: string; name: string }>;
  canEdit: boolean;
}) {
  const overdue = task.dueDate && !task.completedAt && isPast(task.dueDate);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tasks/${task.id}`}
          className="font-mono text-xs text-slate-500 hover:underline dark:text-slate-400"
        >
          {taskRef(projectKey, task.number)}
        </Link>
        <PriorityBadge priority={task.priority} />
      </div>

      <Link href={`/tasks/${task.id}`} className="mt-1.5 block text-sm font-medium hover:underline">
        {task.title}
      </Link>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <Avatar name={task.assigneeName} image={task.assigneeImage} className="size-5" />

        {task.dueDate && (
          <span
            className={
              overdue
                ? "inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"
                : "inline-flex items-center gap-1"
            }
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {format(task.dueDate, "d MMM")}
            {overdue && <span className="sr-only">(overdue)</span>}
          </span>
        )}

        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3.5" aria-hidden />
            {task.commentCount}
            <span className="sr-only">comments</span>
          </span>
        )}
      </div>

      {canEdit && columns.length > 1 && (
        <form
          action={async (formData: FormData) => {
            "use server";
            // A plain form action must resolve to void. The board re-renders
            // from revalidatePath, so the returned state has nowhere to go.
            await moveTask(formData);
          }}
          className="mt-3 flex items-center gap-1.5"
        >
          <input type="hidden" name="id" value={task.id} />
          <label htmlFor={`move-${task.id}`} className="sr-only">
            Move {task.title} to another column
          </label>
          <select
            id={`move-${task.id}`}
            name="statusId"
            defaultValue={task.statusId}
            className="w-full cursor-pointer rounded border border-slate-200 bg-transparent px-1.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400"
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="cursor-pointer rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Move
          </button>
        </form>
      )}
    </article>
  );
}
