import { describe, expect, it } from "vitest";

import { createCommentSchema, createProjectSchema, createTaskSchema } from "./validation";

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("createProjectSchema", () => {
  it("uppercases the key and trims the name", () => {
    const result = createProjectSchema.parse({
      name: "  Website Relaunch  ",
      key: "web",
      description: "",
    });

    expect(result.name).toBe("Website Relaunch");
    expect(result.key).toBe("WEB");
  });

  it("rejects a key that starts with a digit", () => {
    expect(createProjectSchema.safeParse({ name: "Valid", key: "1WEB" }).success).toBe(false);
  });

  it("rejects a key with punctuation", () => {
    expect(createProjectSchema.safeParse({ name: "Valid", key: "WE-B" }).success).toBe(false);
  });

  it("rejects a name that is too short", () => {
    expect(createProjectSchema.safeParse({ name: "A", key: "WEB" }).success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  const base = { projectId: UUID, title: "Migrate the pricing page", statusId: UUID };

  it("defaults priority to medium", () => {
    expect(createTaskSchema.parse(base).priority).toBe("medium");
  });

  it("normalises an unselected assignee to null", () => {
    expect(createTaskSchema.parse({ ...base, assigneeId: "" }).assigneeId).toBeNull();
    expect(createTaskSchema.parse(base).assigneeId).toBeNull();
  });

  it("parses a date input into a Date", () => {
    const result = createTaskSchema.parse({ ...base, dueDate: "2026-03-14" });
    expect(result.dueDate?.toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });

  it("normalises an empty due date to null", () => {
    expect(createTaskSchema.parse({ ...base, dueDate: "" }).dueDate).toBeNull();
  });

  it("rejects a non-uuid project id", () => {
    expect(createTaskSchema.safeParse({ ...base, projectId: "nope" }).success).toBe(false);
  });

  it("rejects an unknown priority", () => {
    expect(createTaskSchema.safeParse({ ...base, priority: "critical" }).success).toBe(false);
  });
});

describe("createCommentSchema", () => {
  it("rejects a whitespace-only body", () => {
    expect(createCommentSchema.safeParse({ taskId: UUID, body: "   " }).success).toBe(false);
  });

  it("accepts a real comment", () => {
    expect(createCommentSchema.parse({ taskId: UUID, body: " Looks good " }).body).toBe(
      "Looks good",
    );
  });
});
