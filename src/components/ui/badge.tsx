import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, PRIORITY_STYLES } from "@/lib/constants";
import type { TaskPriority } from "@/db/schema";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
