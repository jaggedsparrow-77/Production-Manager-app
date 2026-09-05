import type { StatusCategory, TaskPriority } from "@/db/schema";

/** Board columns created for every new project. Users can edit them after. */
export const DEFAULT_STATUSES: ReadonlyArray<{ name: string; category: StatusCategory }> = [
  { name: "Backlog", category: "backlog" },
  { name: "In Progress", category: "active" },
  { name: "In Review", category: "active" },
  { name: "Done", category: "done" },
];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

/** Tailwind classes per priority, kept next to the labels so they stay in sync. */
export const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  high: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  urgent: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300",
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
