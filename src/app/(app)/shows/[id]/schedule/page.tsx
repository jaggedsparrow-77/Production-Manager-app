import type { Metadata } from "next";
import { format } from "date-fns";

import { getShowSchedule } from "@/server/queries";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { show } = await getShowSchedule(id);
  return { title: `${show.title} · Schedule` };
}

export default async function SchedulePage({ params }: Props) {
  const { id } = await params;
  const { calls } = await getShowSchedule(id);

  return (
    <div style={{ padding: "var(--space-6)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <h6 style={{ margin: 0 }}>Production schedule</h6>
        <Button
          variant="secondary"
          style={{ marginLeft: "auto" }}
          disabled
          title="Not implemented yet"
        >
          Add call
        </Button>
      </div>

      {calls.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13 }}>
          No calls scheduled yet.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Day</th>
                <th>Call</th>
                <th>Time</th>
                <th>Space</th>
                <th>Departments</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <strong>{format(call.startAt, "EEE")}</strong>{" "}
                    <span className="text-muted">{format(call.startAt, "d MMM")}</span>
                  </td>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                    {call.title}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {format(call.startAt, "HH:mm")}
                    {call.endAt ? `–${format(call.endAt, "HH:mm")}` : ""}
                  </td>
                  <td>{call.location}</td>
                  <td style={{ fontSize: 12.5 }}>{call.departmentsLabel}</td>
                  <td className="text-muted" style={{ fontSize: 12.5, maxWidth: 260 }}>
                    {call.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
