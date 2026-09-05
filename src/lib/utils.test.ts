import { describe, expect, it } from "vitest";

import { cn, completionPercent, initials, suggestProjectKey, taskRef } from "./utils";

describe("cn", () => {
  it("lets later Tailwind classes win on conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("p-2", false && "p-4", undefined, null)).toBe("p-2");
  });
});

describe("taskRef", () => {
  it("formats a project-scoped reference", () => {
    expect(taskRef("WEB", 42)).toBe("WEB-42");
  });
});

describe("suggestProjectKey", () => {
  it("takes the first letters of a multi-word name", () => {
    expect(suggestProjectKey("Website Relaunch")).toBe("WR");
    expect(suggestProjectKey("Platform Reliability Engineering")).toBe("PRE");
  });

  it("truncates a single word to four characters", () => {
    expect(suggestProjectKey("Website")).toBe("WEBS");
  });

  it("ignores punctuation", () => {
    expect(suggestProjectKey("Q4 — Growth!")).toBe("QG");
  });

  it("caps long names at four initials", () => {
    expect(suggestProjectKey("one two three four five six")).toBe("OTTF");
  });

  it("returns an empty string when there is nothing to derive from", () => {
    expect(suggestProjectKey("   ")).toBe("");
    expect(suggestProjectKey("!!!")).toBe("");
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Mary Lee Berners Lee")).toBe("ML");
  });

  it("uses the first two letters of a single name", () => {
    expect(initials("Ada")).toBe("AD");
  });

  it("falls back when there is no name", () => {
    expect(initials(null)).toBe("?");
    expect(initials(undefined, "–")).toBe("–");
    expect(initials("")).toBe("?");
  });
});

describe("completionPercent", () => {
  it("rounds to the nearest percent", () => {
    expect(completionPercent(1, 3)).toBe(33);
    expect(completionPercent(2, 3)).toBe(67);
  });

  it("returns 0 rather than NaN for an empty project", () => {
    expect(completionPercent(0, 0)).toBe(0);
  });

  it("handles a fully complete project", () => {
    expect(completionPercent(5, 5)).toBe(100);
  });
});
