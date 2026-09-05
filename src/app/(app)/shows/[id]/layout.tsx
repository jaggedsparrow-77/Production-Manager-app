import { notFound } from "next/navigation";

import { getShowHeader, listShowsForNav } from "@/server/queries";
import { HealthBadge } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { DecisionDialogButton } from "@/components/decision-dialog";
import { ShowTabs } from "@/components/show-tabs";
import { runLabel } from "@/lib/utils";

type Props = { children: React.ReactNode; params: Promise<{ id: string }> };

export default async function ShowLayout({ children, params }: Props) {
  const { id } = await params;
  const [{ show }, allShows] = await Promise.all([getShowHeader(id), listShowsForNav()]);
  if (!show) notFound();

  return (
    <div>
      <div style={{ padding: "var(--space-6) var(--space-6) var(--space-4)" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: 6,
          }}
        >
          {show.venue}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <h1>{show.title}</h1>
          <HealthBadge state={show.state} />
          <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)" }}>
            <Button variant="secondary" disabled title="Not implemented yet">
              Export schedule
            </Button>
            <DecisionDialogButton
              shows={allShows.map((s) => ({ id: s.id, title: s.title }))}
              defaultShowId={show.id}
            />
          </div>
        </div>
        <div
          className="text-muted"
          style={{
            display: "flex",
            gap: "var(--space-6)",
            flexWrap: "wrap",
            fontSize: 12.5,
            marginTop: "var(--space-3)",
          }}
        >
          <span>Run · {runLabel(show.openDate, show.closeDate)}</span>
          {show.director && <span>Director · {show.director}</span>}
          {show.designer && <span>Designer · {show.designer}</span>}
          {show.companySize != null && <span>Company · {show.companySize} people</span>}
        </div>
      </div>

      <ShowTabs showId={show.id} />

      {children}
    </div>
  );
}
