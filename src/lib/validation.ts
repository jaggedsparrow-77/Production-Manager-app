import { z } from "zod";
import { DECISION_DEPARTMENTS } from "./constants";

/**
 * Input schemas shared by server actions and forms.
 *
 * Server actions receive untrusted FormData, so every action parses its
 * input through one of these before touching the database. Kept in a
 * client-safe module (no db imports) so forms can reuse the same rules for
 * inline hints.
 */

const trimmed = (max: number) => z.string().trim().max(max);

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null));

const optionalTag = z
  .union([z.enum(["at_risk", "urgent", "carried_forward"]), z.literal("")])
  .optional()
  .transform((value) => (value ? value : null));

export const createShowSchema = z.object({
  title: trimmed(120).min(2, "Title must be at least 2 characters"),
  venue: trimmed(120).min(2, "Venue must be at least 2 characters"),
  openDate: z.iso.date("Enter a valid open date"),
  closeDate: z.iso.date("Enter a valid close date"),
  phase: trimmed(60).min(2, "Phase must be at least 2 characters"),
  director: trimmed(120).optional().or(z.literal("")),
  designer: trimmed(120).optional().or(z.literal("")),
  companySize: z.coerce.number().int().positive().optional().or(z.literal("")),
});

export const logDecisionSchema = z.object({
  showId: z.uuid(),
  department: z.enum(DECISION_DEPARTMENTS),
  text: trimmed(2000).min(2, "Enter what was decided"),
});

export const addDepartmentNoteSchema = z.object({
  departmentId: z.uuid(),
  body: trimmed(2000).min(2, "Enter a note"),
});

export const addTaskSchema = z.object({
  showId: z.uuid(),
  label: trimmed(300).min(2, "Enter a task"),
  ownerName: trimmed(120).min(1, "Enter an owner"),
  dueDate: optionalDate,
  tag: optionalTag,
});

export const toggleTaskSchema = z.object({
  id: z.uuid(),
  done: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const addMeetingActionSchema = z.object({
  meetingId: z.uuid(),
  text: trimmed(300).min(2, "Enter an action"),
  ownerName: trimmed(120).min(1, "Enter an owner"),
  dueDate: optionalDate,
  tag: optionalTag,
});

export const toggleMeetingActionSchema = z.object({
  id: z.uuid(),
  done: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const addOrganizationMemberSchema = z.object({
  email: z.email("Enter a valid email address").toLowerCase(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export type CreateShowInput = z.infer<typeof createShowSchema>;
export type LogDecisionInput = z.infer<typeof logDecisionSchema>;
