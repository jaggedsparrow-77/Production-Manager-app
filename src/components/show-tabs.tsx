"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SHOW_TABS } from "@/lib/constants";

export function ShowTabs({ showId }: { showId: string }) {
  const pathname = usePathname();
  const base = `/shows/${showId}`;

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "2px solid var(--color-divider)",
        padding: "0 var(--space-6)",
        overflowX: "auto",
      }}
    >
      {SHOW_TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = tab.segment ? pathname.startsWith(href) : pathname === base;

        return (
          <Link
            key={tab.segment}
            href={href}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "11px var(--space-4)",
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 14,
              whiteSpace: "nowrap",
              marginBottom: -2,
              borderBottom: `3px solid ${active ? "var(--color-accent)" : "transparent"}`,
              color: active
                ? "var(--color-text)"
                : "color-mix(in srgb, var(--color-text) 60%, transparent)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
