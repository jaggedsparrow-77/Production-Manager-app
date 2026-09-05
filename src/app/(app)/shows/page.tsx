import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

import { getPortfolio } from "@/server/queries";
import { moneyShort, numberWord, percentOf, runLabel, seasonLabel } from "@/lib/utils";
import { HealthBadge } from "@/components/ui/tag";
import { NewShowForm } from "./new-show-form";

export const metadata: Metadata = { title: "Shows" };

export default async function ShowsPage() {
  const { organization, shows, metrics, feed } = await getPortfolio();
  const currency = organization.currency;

  const metricTiles = [
    { label: "In flight", value: String(metrics.inFlight), note: "productions" },
    {
      label: "Committed",
      value: moneyShort(metrics.committed, currency),
      note: `of ${moneyShort(metrics.allocated, currency)} allocated`,
    },
    {
      label: "Opening ≤ 6 weeks",
      value: String(metrics.openingSoon.length),
      note: metrics.openingSoon.map((s) => s.title).join(", ") || "None scheduled",
    },
    {
      label: "Open flags",
      value: String(metrics.openFlagCount),
      note:
        metrics.openFlagShowCount === 0
          ? "None open"
          : `across ${metrics.openFlagShowCount} production${metrics.openFlagShowCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div>
      <div
        style={{
          padding: "var(--space-6) var(--space-6) var(--space-4)",
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: 6,
            }}
          >
            {seasonLabel()}
          </div>
          <h1>SHOWS</h1>
        </div>
        <div className="text-muted" style={{ marginLeft: "auto", fontSize: 13, maxWidth: 320 }}>
          {numberWord(metrics.inFlight)} production{metrics.inFlight === 1 ? "" : "s"} in flight.{" "}
          {numberWord(metrics.openingSoon.length)} open inside the next six weeks.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          borderTop: "2px solid var(--color-divider)",
          borderBottom: "2px solid var(--color-divider)",
        }}
      >
        {metricTiles.map((m) => (
          <div
            key={m.label}
            style={{
              padding: "var(--space-3) var(--space-6)",
              borderLeft: "1px solid var(--color-divider)",
            }}
          >
            <div
              className="text-muted"
              style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: 26,
                lineHeight: 1.15,
                marginTop: 4,
              }}
            >
              {m.value}
            </div>
            <div className="text-muted" style={{ fontSize: 11 }}>
              {m.note}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
        <section style={{ flex: "1 1 460px", minWidth: 0, padding: "var(--space-6)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-3)",
              marginBottom: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <h6 style={{ margin: 0 }}>Productions</h6>
            <div style={{ marginLeft: "auto" }}>
              <NewShowForm />
            </div>
          </div>

          {shows.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              No shows yet — create the first one above.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {shows.map((show) => {
                const pct = percentOf(show.budget.spent, show.budget.allocated);
                return (
                  <Link
                    key={show.id}
                    href={`/shows/${show.id}`}
                    style={{
                      cursor: "pointer",
                      padding: "var(--space-4) 0",
                      borderTop: "1px solid var(--color-divider)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-4)",
                      alignItems: "flex-start",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                      >
                        <h4 style={{ margin: 0, fontSize: 19 }}>{show.title}</h4>
                        <HealthBadge state={show.state} />
                      </div>
                      <div className="text-muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                        {show.venue} · {runLabel(show.openDate, show.closeDate)}
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 8 }}>
                        Next:{" "}
                        <strong>
                          {show.nextCall
                            ? `${show.nextCall.title}, ${format(show.nextCall.startAt, "EEE HH:mm")}`
                            : "No upcoming calls scheduled"}
                        </strong>
                      </div>
                    </div>
                    <div style={{ flex: "1 1 200px", maxWidth: 260, minWidth: 150 }}>
                      <div
                        className="text-muted"
                        style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}
                      >
                        <span>Spend</span>
                        <span>
                          {moneyShort(show.budget.spent, currency)} /{" "}
                          {moneyShort(show.budget.allocated, currency)}
                        </span>
                      </div>
                      <div
                        style={{ height: 8, background: "var(--color-neutral-300)", marginTop: 5 }}
                      >
                        <div
                          style={{ height: 8, background: "var(--color-accent)", width: `${pct}%` }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 6,
                          color: show.state === "ok" ? undefined : "var(--color-accent-700)",
                        }}
                        className={show.state === "ok" ? "text-muted" : undefined}
                      >
                        {show.flagsSummary ?? "On plan"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            flex: "1 1 372px",
            minWidth: 290,
            borderLeft: "2px solid var(--color-divider)",
            padding: "var(--space-6)",
          }}
        >
          <h6 style={{ margin: "0 0 var(--space-3)" }}>Activity &amp; decisions</h6>

          {feed.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              Nothing logged yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {feed.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "var(--space-3) 0",
                    borderTop: "1px solid var(--color-divider)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span
                      className="tag"
                      style={{
                        background:
                          entry.kind === "decision"
                            ? "var(--color-accent-200)"
                            : entry.kind === "budget"
                              ? "var(--color-accent-2-100)"
                              : "var(--color-neutral-200)",
                        color:
                          entry.kind === "decision"
                            ? "var(--color-accent-800)"
                            : entry.kind === "budget"
                              ? "var(--color-accent-2-800)"
                              : "var(--color-neutral-800)",
                      }}
                    >
                      {entry.kind === "decision"
                        ? "Decision"
                        : entry.kind === "budget"
                          ? "Budget"
                          : "Update"}
                    </span>
                    <span className="text-muted" style={{ fontSize: 11, marginLeft: "auto" }}>
                      {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.45 }}>{entry.text}</div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 5 }}>
                    {entry.showTitle}
                    {entry.departmentName ? ` · ${entry.departmentName}` : ""} · {entry.authorName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
