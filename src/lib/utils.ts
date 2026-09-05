import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

/**
 * Merge Tailwind classes so later ones win on conflict.
 * `cn("p-2", condition && "p-4")` → "p-4" rather than both.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** "£38,000" — whole-currency-unit amounts only, no fractional pence. */
export function money(amount: number, currency = "£") {
  return currency + Math.round(amount).toLocaleString("en-GB");
}

/** Compact form for tight spaces: "£248,000" → "£248k", "£1,200,000" → "£1.20M". */
export function moneyShort(amount: number, currency = "£") {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return currency + (amount / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return currency + Math.round(amount / 1_000) + "k";
  return currency + Math.round(amount);
}

/** Percentage of a budget committed/spent, rounded. 0 for a zero allocation. */
export function percentOf(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** "14 Oct – 8 Nov" — omits the repeated month when both dates share one. */
export function runLabel(openDate: Date, closeDate: Date) {
  const sameMonth = openDate.getMonth() === closeDate.getMonth();
  const open = format(openDate, sameMonth ? "d" : "d MMM");
  const close = format(closeDate, "d MMM");
  return `${open} – ${close}`;
}

/** URL-safe slug for a department name: "AV" -> "av", "House Crew" -> "house-crew". */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SMALL_NUMBER_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

/** "Four" for 4, falling back to the numeral once it's too big to read as a word. */
export function numberWord(n: number) {
  return SMALL_NUMBER_WORDS[n] ?? String(n);
}

/** "Season 2025/26" — a theatre season conventionally runs Aug–Jul. */
export function seasonLabel(date = new Date()) {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 7 ? year : year - 1;
  return `Season ${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** "PM 6" -> "Production meeting 6" — the ref is the primary key-ish label; this is its long form. */
export function meetingTitle(ref: string) {
  return ref.replace(/^PM\s*/i, "Production meeting ");
}

export type CallTiming = "past" | "now" | "next";

/** Where a schedule call sits relative to `now` — drives the "On now" badge. */
export function callTiming(startAt: Date, endAt: Date | null, now = new Date()): CallTiming {
  const effectiveEnd = endAt ?? new Date(startAt.getTime() + 60 * 60 * 1000);
  if (now < startAt) return "next";
  if (now > effectiveEnd) return "past";
  return "now";
}
