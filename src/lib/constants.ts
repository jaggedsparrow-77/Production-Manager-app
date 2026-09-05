import type { FlagTag, HealthState, MeetingStatus } from "@/db/schema";

/**
 * The decision-log dialog offers a fixed department picker rather than
 * pulling from each show's actual department rows — a decision can concern a
 * department a given show hasn't set up yet, and the dialog has no notion of
 * "which show" until the producer picks one.
 */
export const DECISION_DEPARTMENTS = [
  "Lighting",
  "Sound",
  "AV",
  "Staging",
  "Costume",
  "Production",
] as const;

export const FLAG_LABELS: Record<FlagTag, string> = {
  at_risk: "At risk",
  urgent: "Urgent",
  carried_forward: "Carried fwd",
};

/** Tag pill modifier, applied alongside the base `.tag` class (globals.css). */
export const FLAG_CLASSES: Record<FlagTag, string> = {
  at_risk: "tag-accent",
  urgent: "tag-accent-2",
  carried_forward: "tag-neutral",
};

export const HEALTH_LABELS: Record<HealthState, string> = {
  ok: "On track",
  warn: "Needs attention",
  risk: "At risk",
};

/** CSS custom-property name backing each state's status dot. */
export const HEALTH_DOT_VAR: Record<HealthState, string> = {
  ok: "var(--color-neutral-600)",
  warn: "var(--color-accent-400)",
  risk: "var(--color-accent)",
};

export const HEALTH_TAG_CLASSES: Record<HealthState, string> = {
  ok: "tag-neutral",
  warn: "tag-accent-2",
  risk: "tag-accent",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  minutes_issued: "Minutes issued",
};

export const SHOW_TABS = [
  { segment: "", label: "Overview" },
  { segment: "schedule", label: "Schedule" },
  { segment: "meetings", label: "Meetings" },
  { segment: "budget", label: "Budget" },
  { segment: "departments", label: "Departments" },
] as const;
