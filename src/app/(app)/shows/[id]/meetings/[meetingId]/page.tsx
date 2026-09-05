import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { getMeetingDetail } from "@/server/queries";
import { toggleMeetingAction } from "@/server/actions";
import { MEETING_STATUS_LABELS } from "@/lib/constants";
import { meetingTitle } from "@/lib/utils";
import { FlagBadge } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/components/toggle-row";
import { AddMeetingActionForm } from "./add-action-form";

type Props = { params: Promise<{ id: string; meetingId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, meetingId } = await params;
  const { show, meeting } = await getMeetingDetail(id, meetingId);
  return { title: `${show.title} · ${meeting.ref}` };
}

export default async function MeetingDetailPage({ params }: Props) {
  const { id, meetingId } = await params;
  const { meetings, meeting, minutes, actions } = await getMeetingDetail(id, meetingId);

  const chronological = [...meetings].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
  );
  const index = chronological.findIndex((m) => m.id === meeting.id);
  const next = index >= 0 ? chronological[index + 1] : undefined;
  const openActions = actions.filter((a) => !a.done).length;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
      <aside
        style={{
          flex: "1 1 232px",
          maxWidth: 280,
          minWidth: 200,
          borderRight: "2px solid var(--color-divider)",
          padding: "var(--space-6) 0",
        }}
      >
        <h6 style={{ margin: "0 0 var(--space-2)", padding: "0 var(--space-4)" }}>
          Production meetings
        </h6>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {meetings.map((m) => {
            const active = m.id === meeting.id;
            return (
              <Link
                key={m.id}
                href={`/shows/${id}/meetings/${m.id}`}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "9px var(--space-4)",
                  borderLeft: `3px solid ${active ? "var(--color-accent)" : "transparent"}`,
                  background: active ? "var(--color-surface)" : "transparent",
                }}
              >
                <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span
                    style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13.5 }}
                  >
                    {m.ref}
                  </span>
                  <span className="text-muted" style={{ fontSize: 11.5 }}>
                    {format(m.scheduledAt, "EEE d MMM")}
                  </span>
                </span>
                <span className="text-muted" style={{ fontSize: 11 }}>
                  {MEETING_STATUS_LABELS[m.status]}
                </span>
              </Link>
            );
          })}
        </div>
        <div style={{ padding: "var(--space-4)" }}>
          <Button variant="secondary" className="btn-block" disabled title="Not implemented yet">
            Schedule meeting
          </Button>
        </div>
      </aside>

      <section style={{ flex: "1 1 380px", minWidth: 0 }}>
        <div style={{ padding: "var(--space-6)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
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
                {meeting.ref} · {MEETING_STATUS_LABELS[meeting.status]}
              </div>
              <h3 style={{ margin: "0 0 6px" }}>{meetingTitle(meeting.ref)}</h3>
              <div className="text-muted" style={{ fontSize: 12.5 }}>
                {format(meeting.scheduledAt, "EEE d MMM, HH:mm")}
                {meeting.endAt ? `–${format(meeting.endAt, "HH:mm")}` : ""} · {meeting.location} ·
                Chaired by {meeting.chairName}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)" }}>
              <Button variant="secondary" disabled title="Not implemented yet">
                Download PDF
              </Button>
              <Button disabled title="Not implemented yet">
                Circulate minutes
              </Button>
            </div>
          </div>
          <div
            className="text-muted"
            style={{
              display: "flex",
              gap: "var(--space-6)",
              flexWrap: "wrap",
              marginTop: "var(--space-4)",
              paddingTop: "var(--space-3)",
              borderTop: "1px solid var(--color-divider)",
              fontSize: 12,
            }}
          >
            <span>
              <strong style={{ color: "var(--color-text)" }}>Present</strong> ·{" "}
              {meeting.presentSummary ?? "—"}
            </span>
            <span>
              <strong style={{ color: "var(--color-text)" }}>Apologies</strong> ·{" "}
              {meeting.apologiesSummary ?? "—"}
            </span>
            <span>
              <strong style={{ color: "var(--color-text)" }}>Next</strong> ·{" "}
              {next
                ? `${next.ref} · ${format(next.scheduledAt, "EEE d MMM")}`
                : "Not yet scheduled"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "stretch",
            borderTop: "2px solid var(--color-divider)",
          }}
        >
          <div style={{ flex: "1 1 400px", minWidth: 0, padding: "var(--space-6)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <h6 style={{ margin: 0 }}>Minutes</h6>
              {meeting.minuteTakerName && (
                <span
                  className="text-muted"
                  style={{ fontSize: 11, flex: "none", whiteSpace: "nowrap", marginLeft: "auto" }}
                >
                  Taken by {meeting.minuteTakerName}
                </span>
              )}
            </div>
            {minutes.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 13 }}>
                No minutes recorded yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {minutes.map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      gap: "var(--space-4)",
                      padding: "var(--space-3) 0",
                      borderTop: "1px solid var(--color-divider)",
                    }}
                  >
                    <div
                      className="text-muted"
                      style={{
                        flex: "0 0 30px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {i + 1}.
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 800,
                          fontSize: 13.5,
                        }}
                      >
                        {n.item}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.5,
                          marginTop: 4,
                          color: "color-mix(in srgb, var(--color-text) 78%, transparent)",
                        }}
                      >
                        {n.note}
                      </div>
                      {n.decision && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "baseline",
                            marginTop: 8,
                            paddingLeft: 10,
                            borderLeft: "2px solid var(--color-accent)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--color-accent-700)",
                              flex: "none",
                            }}
                          >
                            Decision
                          </span>
                          <span style={{ fontSize: 13, lineHeight: 1.45 }}>{n.decision}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              flex: "1 1 340px",
              minWidth: 280,
              borderLeft: "2px solid var(--color-divider)",
              padding: "var(--space-6)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <h6 style={{ margin: 0 }}>Actions</h6>
              <span
                className="text-muted"
                style={{ fontSize: 11, flex: "none", whiteSpace: "nowrap", marginLeft: "auto" }}
              >
                {openActions} open
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {actions.map((action) => (
                <ToggleRow
                  key={action.id}
                  id={action.id}
                  done={action.done}
                  action={toggleMeetingAction}
                >
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        lineHeight: 1.45,
                        textDecoration: action.done ? "line-through" : "none",
                      }}
                    >
                      {action.text}
                    </span>
                    <span
                      className="text-muted"
                      style={{ display: "block", fontSize: 11, marginTop: 4 }}
                    >
                      {meeting.ref} · {action.ownerName}
                      {action.dueDate ? ` · due ${format(action.dueDate, "EEE d MMM")}` : ""}
                    </span>
                  </span>
                  {!action.done && <FlagBadge tag={action.tag} />}
                </ToggleRow>
              ))}
            </div>
            <AddMeetingActionForm meetingId={meeting.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
