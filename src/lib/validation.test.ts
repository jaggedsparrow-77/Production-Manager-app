import { describe, expect, it } from "vitest";

import {
  addMeetingActionSchema,
  addOrganizationMemberSchema,
  createShowSchema,
  logDecisionSchema,
} from "./validation";

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("createShowSchema", () => {
  const base = {
    title: "Twelfth Night",
    venue: "Main House",
    openDate: "2026-10-06",
    closeDate: "2026-11-08",
    phase: "Pre-production",
  };

  it("accepts a well-formed show", () => {
    expect(createShowSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a title that is too short", () => {
    expect(createShowSchema.safeParse({ ...base, title: "A" }).success).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(createShowSchema.safeParse({ ...base, openDate: "6 Oct" }).success).toBe(false);
  });

  it("treats an empty optional field as absent rather than invalid", () => {
    expect(createShowSchema.safeParse({ ...base, director: "" }).success).toBe(true);
  });
});

describe("logDecisionSchema", () => {
  it("requires the department to be one of the fixed list", () => {
    expect(
      logDecisionSchema.safeParse({
        showId: UUID,
        department: "Catering",
        text: "Decided something",
      }).success,
    ).toBe(false);
    expect(
      logDecisionSchema.safeParse({
        showId: UUID,
        department: "Lighting",
        text: "Decided something",
      }).success,
    ).toBe(true);
  });

  it("rejects a near-empty decision", () => {
    expect(
      logDecisionSchema.safeParse({ showId: UUID, department: "Sound", text: "x" }).success,
    ).toBe(false);
  });
});

describe("addMeetingActionSchema", () => {
  const base = { meetingId: UUID, text: "Chase the certificate", ownerName: "Karl Doyle" };

  it("normalises an empty due date to null", () => {
    expect(addMeetingActionSchema.parse({ ...base, dueDate: "" }).dueDate).toBeNull();
  });

  it("parses a due date into a Date", () => {
    const result = addMeetingActionSchema.parse({ ...base, dueDate: "2026-03-14" });
    expect(result.dueDate?.toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });

  it("normalises an unselected flag to null", () => {
    expect(addMeetingActionSchema.parse({ ...base, tag: "" }).tag).toBeNull();
    expect(addMeetingActionSchema.parse(base).tag).toBeNull();
  });

  it("rejects an unknown flag", () => {
    expect(addMeetingActionSchema.safeParse({ ...base, tag: "on_fire" }).success).toBe(false);
  });
});

describe("addOrganizationMemberSchema", () => {
  it("lower-cases the email", () => {
    expect(addOrganizationMemberSchema.parse({ email: "Karl@Example.com" }).email).toBe(
      "karl@example.com",
    );
  });

  it("defaults role to member", () => {
    expect(addOrganizationMemberSchema.parse({ email: "karl@example.com" }).role).toBe("member");
  });

  it("rejects an invalid email", () => {
    expect(addOrganizationMemberSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
