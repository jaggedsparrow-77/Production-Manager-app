import { describe, expect, it } from "vitest";

import {
  callTiming,
  cn,
  initials,
  meetingTitle,
  money,
  moneyShort,
  numberWord,
  percentOf,
  runLabel,
  seasonLabel,
  slugify,
} from "./utils";

describe("cn", () => {
  it("lets later Tailwind classes win on conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("p-2", false && "p-4", undefined, null)).toBe("p-2");
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Ines Marchetti")).toBe("IM");
    expect(initials("Mary Lee Berners Lee")).toBe("ML");
  });

  it("uses the first two letters of a single name", () => {
    expect(initials("Ines")).toBe("IN");
  });

  it("falls back when there is no name", () => {
    expect(initials(null)).toBe("?");
    expect(initials(undefined, "–")).toBe("–");
    expect(initials("")).toBe("?");
  });
});

describe("money", () => {
  it("formats a whole-currency-unit amount with the given symbol", () => {
    expect(money(38000)).toBe("£38,000");
    expect(money(1200, "$")).toBe("$1,200");
  });

  it("rounds fractional input", () => {
    expect(money(1999.6)).toBe("£2,000");
  });
});

describe("moneyShort", () => {
  it("compacts thousands and millions", () => {
    expect(moneyShort(248000)).toBe("£248k");
    expect(moneyShort(1_200_000)).toBe("£1.20M");
    expect(moneyShort(500)).toBe("£500");
  });

  it("handles negative amounts", () => {
    expect(moneyShort(-2000)).toBe("£-2k");
  });
});

describe("percentOf", () => {
  it("rounds to the nearest percent", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(74500, 82000)).toBe(91);
  });

  it("returns 0 rather than dividing by zero", () => {
    expect(percentOf(0, 0)).toBe(0);
  });
});

describe("runLabel", () => {
  it("omits the repeated month when open and close share one", () => {
    expect(runLabel(new Date("2026-10-04"), new Date("2026-10-18"))).toBe("4 – 18 Oct");
  });

  it("shows both months when they differ", () => {
    expect(runLabel(new Date("2026-10-14"), new Date("2026-11-08"))).toBe("14 Oct – 8 Nov");
  });
});

describe("slugify", () => {
  it("lower-cases and hyphenates", () => {
    expect(slugify("AV")).toBe("av");
    expect(slugify("House Crew")).toBe("house-crew");
  });

  it("strips leading and trailing separators", () => {
    expect(slugify("  Sound & Video!  ")).toBe("sound-video");
  });
});

describe("callTiming", () => {
  const start = new Date("2026-01-01T10:00:00Z");
  const end = new Date("2026-01-01T12:00:00Z");

  it("is 'next' before the call starts", () => {
    expect(callTiming(start, end, new Date("2026-01-01T09:00:00Z"))).toBe("next");
  });

  it("is 'now' between start and end", () => {
    expect(callTiming(start, end, new Date("2026-01-01T11:00:00Z"))).toBe("now");
  });

  it("is 'past' after the call ends", () => {
    expect(callTiming(start, end, new Date("2026-01-01T13:00:00Z"))).toBe("past");
  });

  it("assumes a one-hour call when there is no end time", () => {
    expect(callTiming(start, null, new Date("2026-01-01T10:30:00Z"))).toBe("now");
    expect(callTiming(start, null, new Date("2026-01-01T11:30:00Z"))).toBe("past");
  });
});

describe("numberWord", () => {
  it("spells out small counts", () => {
    expect(numberWord(0)).toBe("Zero");
    expect(numberWord(4)).toBe("Four");
  });

  it("falls back to the numeral once too big to read as a word", () => {
    expect(numberWord(11)).toBe("11");
  });
});

describe("seasonLabel", () => {
  it("uses the current year when the month is August or later", () => {
    expect(seasonLabel(new Date("2025-10-06"))).toBe("Season 2025/26");
  });

  it("uses the previous year when earlier than August", () => {
    expect(seasonLabel(new Date("2026-03-01"))).toBe("Season 2025/26");
  });
});

describe("meetingTitle", () => {
  it("expands a PM ref into its long form", () => {
    expect(meetingTitle("PM 6")).toBe("Production meeting 6");
  });
});
