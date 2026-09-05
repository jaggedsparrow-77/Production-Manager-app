import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes so later ones win on conflict.
 * `cn("p-2", condition && "p-4")` → "p-4" rather than both.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "WEB-42" — the human-facing reference for a task. */
export function taskRef(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

/**
 * Turn a project name into a candidate key: "Website Relaunch" → "WEB".
 * Callers must still handle collisions; this only proposes a default.
 */
export function suggestProjectKey(name: string) {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 4);

  return words
    .slice(0, 4)
    .map((word) => word[0]!)
    .join("");
}

export function initials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Percentage of tasks completed, rounded. Returns 0 for an empty project. */
export function completionPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
