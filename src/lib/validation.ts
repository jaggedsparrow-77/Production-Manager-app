import { z } from "zod";

/**
 * Input schemas shared by server actions and forms.
 *
 * Server actions receive untrusted FormData, so every action parses its input
 * through one of these before touching the database. Keeping them in a
 * client-safe module (no db imports) lets forms reuse them for inline hints.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const projectKeySchema = trimmed(10)
  .min(2, "Key must be at least 2 characters")
  .regex(/^[A-Za-z][A-Za-z0-9]*$/, "Key must start with a letter and contain only letters/numbers")
  .transform((value) => value.toUpperCase());

export const createProjectSchema = z.object({
  name: trimmed(120).min(2, "Name must be at least 2 characters"),
  key: projectKeySchema,
  description: trimmed(2000).optional().or(z.literal("")),
});

export const updateProjectSchema = z.object({
  id: z.uuid(),
  name: trimmed(120).min(2, "Name must be at least 2 characters"),
  description: trimmed(2000).optional().or(z.literal("")),
  status: z.enum(["active", "on_hold", "archived"]),
});

/** Empty string is what an unselected <select> submits; treat it as "none". */
const optionalId = z
  .union([z.uuid(), z.literal("")])
  .optional()
  .transform((value) => (value ? value : null));

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null));

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  title: trimmed(200).min(2, "Title must be at least 2 characters"),
  description: trimmed(5000).optional().or(z.literal("")),
  statusId: z.uuid(),
  assigneeId: optionalId,
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: optionalDate,
});

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: trimmed(200).min(2, "Title must be at least 2 characters"),
  description: trimmed(5000).optional().or(z.literal("")),
  statusId: z.uuid(),
  assigneeId: optionalId,
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: optionalDate,
});

export const moveTaskSchema = z.object({
  id: z.uuid(),
  statusId: z.uuid(),
});

export const createCommentSchema = z.object({
  taskId: z.uuid(),
  body: trimmed(5000).min(1, "Comment cannot be empty"),
});

export const addMemberSchema = z.object({
  projectId: z.uuid(),
  email: z.email("Enter a valid email address").toLowerCase(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
