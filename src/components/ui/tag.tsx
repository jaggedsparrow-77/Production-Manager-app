import { cn } from "@/lib/utils";
import {
  FLAG_CLASSES,
  FLAG_LABELS,
  HEALTH_DOT_VAR,
  HEALTH_TAG_CLASSES,
  HEALTH_LABELS,
} from "@/lib/constants";
import type { FlagTag, HealthState } from "@/db/schema";

export function Tag({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("tag", className)}>{children}</span>;
}

export function FlagBadge({ tag }: { tag: FlagTag | null }) {
  if (!tag) return null;
  return <Tag className={FLAG_CLASSES[tag]}>{FLAG_LABELS[tag]}</Tag>;
}

export function HealthBadge({ state }: { state: HealthState }) {
  return <Tag className={HEALTH_TAG_CLASSES[state]}>{HEALTH_LABELS[state]}</Tag>;
}

/** The small status dot used next to a show/department's health label. */
export function HealthDot({ state }: { state: HealthState }) {
  return (
    <span
      aria-hidden
      style={{
        width: 9,
        height: 9,
        flex: "none",
        background: HEALTH_DOT_VAR[state],
        display: "inline-block",
      }}
    />
  );
}
