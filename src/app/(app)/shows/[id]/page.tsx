import Link from "next/link";
import { format } from "date-fns";

import { getShowOverview } from "@/server/queries";
import { toggleTask } from "@/server/actions";
import { callTiming, moneyShort, slugify } from "@/lib/utils";
import { FlagBadge, HealthDot } from "@/components/ui/tag";
import { ToggleRow } from "@/components/toggle-row";
import { AddTaskForm } from "./add-task-form";

type Props = { params: Promise<{ id: string }> };

export default async function ShowOverviewPage({ params }: Props) {
  const { id } = await params;
  const { show, todayCalls, nextCall, tasks, departments } = await getShowOverview(id);

  const summary =
    todayCalls.length === 0
      ? "No calls scheduled today."
      : `${todayCalls.length} call${todayCalls.length === 1 ? "" : "s"} today, starting with ${todayCalls[0]!.title} at ${format(todayCalls[0]!.startAt, "HH:mm")}.`;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
        <section style={{ flex: "1 1 440px", minWidth: 0, padding: "var(--space-6)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-3)",
              flexWrap: "wrap",
              marginBottom: "var(--space-2)",
            }}
          >
            <h6 style={{ margin: 0 }}>Today</h6>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 15 }}>
              {format(new Date(), "EEE d MMM")}
            </span>
            <Link
              href={`/shows/${id}/schedule`}
              className="btn btn-ghost"
              style={{ marginLeft: "auto", fontSize: 12, flex: "none" }}
            >
              Full schedule
            </Link>
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-3)" }}>
            {summary}
          </p>

          {todayCalls.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: "2px solid var(--color-divider)",
              }}
            >
              {todayCalls.map((call) => {
                const timing = callTiming(call.startAt, call.endAt);
                return (
                  <div
                    key={call.id}
                    style={{
                      display: "flex",
                      gap: "var(--space-4)",
                      padding: "var(--space-3) var(--space-3) var(--space-3) var(--space-3)",
                      borderBottom: "1px solid var(--color-divider)",
                      borderLeft: `3px solid ${timing === "now" ? "var(--color-accent)" : "transparent"}`,
                      background: timing === "now" ? "var(--color-surface)" : undefined,
                      opacity: timing === "past" ? 0.5 : 1,
                    }}
                  >
                    <div style={{ flex: "0 0 68px" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 800,
                          fontSize: 15,
                          lineHeight: 1.2,
                        }}
                      >
                        {format(call.startAt, "HH:mm")}
                      </div>
                      {call.endAt && (
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {format(call.endAt, "HH:mm")}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14.5,
                            fontFamily: "var(--font-heading)",
                            fontWeight: 800,
                          }}
                        >
                          {call.title}
                        </span>
                        {timing === "now" && (
                          <span
                            style={{
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              background: "var(--color-accent)",
                              color: "var(--color-bg)",
                              padding: "2px 7px",
                            }}
                          >
                            On now
                          </span>
                        )}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
                        {call.location} · {call.departmentsLabel}
                      </div>
                      {call.note && (
                        <div style={{ fontSize: 12.5, lineHeight: 1.45, marginTop: 6 }}>
                          {call.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            className="text-muted"
            style={{
              display: "flex",
              gap: "var(--space-6)",
              flexWrap: "wrap",
              paddingTop: "var(--space-3)",
              borderTop: "2px solid var(--color-divider)",
              fontSize: 12,
              marginTop: "var(--space-3)",
            }}
          >
            <span>
              Next ·{" "}
              <strong style={{ color: "var(--color-text)" }}>
                {nextCall
                  ? `${nextCall.title}, ${format(nextCall.startAt, "EEE d MMM, HH:mm")}`
                  : "Nothing scheduled"}
              </strong>
            </span>
            <Link
              href={`/shows/${id}/schedule`}
              className="btn btn-ghost"
              style={{ fontSize: 12, marginLeft: "auto" }}
            >
              See the week
            </Link>
          </div>
        </section>

        <section
          style={{
            flex: "1 1 320px",
            minWidth: 280,
            borderLeft: "2px solid var(--color-divider)",
            padding: "var(--space-6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: "var(--space-3)" }}>
            <h6 style={{ margin: 0 }}>Key tasks</h6>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tasks.map((task) => (
              <ToggleRow key={task.id} id={task.id} done={task.done} action={toggleTask}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      textDecoration: task.done ? "line-through" : "none",
                    }}
                  >
                    {task.label}
                  </span>
                  <span
                    className="text-muted"
                    style={{ display: "block", fontSize: 11, marginTop: 3 }}
                  >
                    {task.ownerName}
                    {task.dueDate ? ` · due ${format(task.dueDate, "EEE d MMM")}` : ""}
                  </span>
                </span>
                {!task.done && <FlagBadge tag={task.tag} />}
              </ToggleRow>
            ))}
          </div>
          <AddTaskForm showId={id} />
        </section>
      </div>

      {departments.length > 0 && (
        <div style={{ borderTop: "2px solid var(--color-divider)", padding: "var(--space-6)" }}>
          <h6 style={{ margin: "0 0 var(--space-3)" }}>Department status</h6>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              borderTop: "1px solid var(--color-divider)",
            }}
          >
            {departments.map((dept) => (
              <Link
                key={dept.id}
                href={`/shows/${id}/departments/${slugify(dept.name)}`}
                style={{
                  cursor: "pointer",
                  padding: "var(--space-4) var(--space-4) var(--space-4) var(--space-4)",
                  borderLeft: "1px solid var(--color-divider)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 15 }}>
                  {dept.name}
                </div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {dept.headName}
                </div>
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <HealthDot state={dept.state} />
                  <span style={{ fontSize: 12 }}>{dept.status}</span>
                </div>
                <div className="text-muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                  {moneyShort(dept.budgetSpent)} of {moneyShort(dept.budgetAllocated)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {tasks.length === 0 && departments.length === 0 && (
        <p
          className="text-muted"
          style={{ padding: "0 var(--space-6) var(--space-6)", fontSize: 13 }}
        >
          No tasks or departments set up for {show.title} yet.
        </p>
      )}
    </div>
  );
}
