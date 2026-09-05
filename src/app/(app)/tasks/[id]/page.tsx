import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";

import { getTaskDetail } from "@/server/queries";
import { roleAtLeast } from "@/server/auth-guards";
import { taskRef } from "@/lib/utils";
import { PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CommentForm } from "./comment-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getTaskDetail(id);
  if (!detail) return { title: "Task" };
  return { title: `${taskRef(detail.task.project.key, detail.task.number)} ${detail.task.title}` };
}

export default async function TaskPage({ params }: Props) {
  const { id } = await params;
  const detail = await getTaskDetail(id);
  if (!detail) notFound();

  const { task, role, comments } = detail;
  const canComment = roleAtLeast(role, "member");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href={`/projects/${task.projectId}`}
          className="text-sm text-slate-500 hover:underline dark:text-slate-400"
        >
          ← {task.project.name}
        </Link>

        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
            {taskRef(task.project.key, task.number)}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{task.title}</h1>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-5 text-sm sm:grid-cols-4 dark:border-slate-800">
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Status</dt>
          <dd className="mt-1 font-medium">{task.status.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Assignee</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium">
            <Avatar name={task.assignee?.name} image={task.assignee?.image} className="size-5" />
            {task.assignee?.name ?? "Unassigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Due</dt>
          <dd className="mt-1 font-medium">
            {task.dueDate ? format(task.dueDate, "d MMM yyyy") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">Created</dt>
          <dd className="mt-1 font-medium">
            {formatDistanceToNow(task.createdAt, { addSuffix: true })}
          </dd>
        </div>
      </dl>

      {task.description && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-400">
            {task.description}
          </p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Avatar name={comment.authorName} image={comment.authorImage} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{comment.authorName ?? "Someone"}</span>{" "}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                    {comment.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {canComment && <CommentForm taskId={task.id} />}
      </section>
    </div>
  );
}
