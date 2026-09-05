import type { Metadata } from "next";

import { getShowBudget } from "@/server/queries";
import { money, percentOf } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { show } = await getShowBudget(id);
  return { title: `${show.title} · Budget` };
}

export default async function BudgetPage({ params }: Props) {
  const { id } = await params;
  const { currency, lines, totals } = await getShowBudget(id);

  const metrics = [
    { label: "Allocated", value: money(totals.allocated, currency) },
    {
      label: "Committed",
      value: money(totals.committed, currency),
      note: `${percentOf(totals.committed, totals.allocated)}% of allocation`,
    },
    { label: "Spent to date", value: money(totals.spent, currency) },
    { label: "Remaining", value: money(totals.allocated - totals.committed, currency) },
  ];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          borderBottom: "2px solid var(--color-divider)",
        }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              padding: "var(--space-4) var(--space-6)",
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
                fontSize: 24,
                marginTop: 4,
              }}
            >
              {m.value}
            </div>
            {m.note && (
              <div className="text-muted" style={{ fontSize: 11 }}>
                {m.note}
              </div>
            )}
          </div>
        ))}
      </div>

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
          <h6 style={{ margin: 0 }}>Budget by department</h6>
          <Button
            variant="secondary"
            style={{ marginLeft: "auto" }}
            disabled
            title="Not implemented yet"
          >
            Export CSV
          </Button>
        </div>

        {lines.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>
            No budget lines set up yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Allocated</th>
                  <th>Committed</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const pct = percentOf(line.committed, line.allocated);
                  const barColor = pct > 92 ? "var(--color-accent)" : "var(--color-neutral-700)";
                  return (
                    <tr key={line.id}>
                      <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                        {line.name}
                      </td>
                      <td>{money(line.allocated, currency)}</td>
                      <td>{money(line.committed, currency)}</td>
                      <td>{money(line.spent, currency)}</td>
                      <td>{money(line.allocated - line.committed, currency)}</td>
                      <td style={{ width: 150 }}>
                        <div style={{ height: 6, background: "var(--color-neutral-300)" }}>
                          <div style={{ height: 6, background: barColor, width: `${pct}%` }} />
                        </div>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {pct}% committed
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: "2px solid var(--color-divider)" }}>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>Total</td>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                    {money(totals.allocated, currency)}
                  </td>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                    {money(totals.committed, currency)}
                  </td>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                    {money(totals.spent, currency)}
                  </td>
                  <td style={{ fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                    {money(totals.allocated - totals.committed, currency)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
