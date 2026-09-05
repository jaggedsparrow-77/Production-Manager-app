"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HealthDot } from "@/components/ui/tag";
import type { HealthState } from "@/db/schema";

type NavShow = { id: string; title: string; phase: string; state: HealthState; openDate: Date };

const navLinkStyle = (active: boolean): React.CSSProperties => ({
  all: "unset",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "9px var(--space-4)",
  borderLeft: `3px solid ${active ? "var(--color-accent)" : "transparent"}`,
  background: active ? "var(--color-surface)" : "transparent",
});

export function ShowsNavLink() {
  const pathname = usePathname();
  const active = pathname === "/shows";

  return (
    <Link
      href="/shows"
      style={{
        all: "unset",
        cursor: "pointer",
        padding: "9px var(--space-4)",
        fontFamily: "var(--font-heading)",
        fontWeight: 800,
        fontSize: 13.5,
        borderLeft: `3px solid ${active ? "var(--color-accent)" : "transparent"}`,
        background: active ? "var(--color-surface)" : "transparent",
      }}
    >
      SHOWS
    </Link>
  );
}

export function ShowNavList({ shows }: { shows: NavShow[] }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {shows.map((show) => {
        const active = pathname.startsWith(`/shows/${show.id}`);
        return (
          <Link key={show.id} href={`/shows/${show.id}`} style={navLinkStyle(active)}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HealthDot state={show.state} />
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: 13.5,
                  lineHeight: 1.2,
                }}
              >
                {show.title}
              </span>
            </span>
            <span className="text-muted" style={{ fontSize: 11, paddingLeft: 16 }}>
              {show.phase} ·{" "}
              {show.openDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
