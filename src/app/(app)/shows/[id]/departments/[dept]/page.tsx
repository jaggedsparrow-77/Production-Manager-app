import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { notFound } from "next/navigation";

import { getShowDepartments } from "@/server/queries";
import { money, percentOf, slugify } from "@/lib/utils";
import { HealthDot } from "@/components/ui/tag";
import { AddDepartmentNoteForm } from "./add-note-form";

type Props = { params: Promise<{ id: string; dept: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, dept } = await params;
  const { show, active } = await getShowDepartments(id, dept);
  return { title: active ? `${show.title} · ${active.name}` : `${show.title} · Departments` };
}

export default async function DepartmentPage({ params }: Props) {
  const { id, dept } = await params;
  const { departments, active, currency } = await getShowDepartments(id, dept);
  if (!active) notFound();

  const pct = percentOf(active.budgetSpent, active.budgetAllocated);

  return (
    <div>
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: "1px solid var(--color-divider)",
          padding: "0 var(--space-6)",
        }}
      >
        {departments.map((d) => {
          const slug = slugify(d.name);
          const isActive = d.id === active.id;
          return (
            <Link
              key={d.id}
              href={`/shows/${id}/departments/${slug}`}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "10px var(--space-4)",
                fontSize: 13.5,
                whiteSpace: "nowrap",
                borderBottom: `2px solid ${isActive ? "var(--color-text)" : "transparent"}`,
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                color: isActive
                  ? "var(--color-text)"
                  : "color-mix(in srgb, var(--color-text) 60%, transparent)",
              }}
            >
              {d.name}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch" }}>
        <section style={{ flex: "1 1 420px", minWidth: 0, padding: "var(--space-6)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-4)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px" }}>{active.name}</h3>
              <div className="text-muted" style={{ fontSize: 12.5 }}>
                {active.headName}
                {active.secondName ? ` · ${active.secondName}` : ""}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <HealthDot state={active.state} />
              <span style={{ fontSize: 13, fontFamily: "var(--font-heading)", fontWeight: 800 }}>
                {active.status}
              </span>
            </div>
          </div>

          <hr className="hr" />

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-2)",
              marginBottom: "var(--space-2)",
            }}
          >
            <h6 style={{ margin: 0 }}>Notes</h6>
          </div>
          {active.notes.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              No notes yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {active.notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    padding: "var(--space-3) 0",
                    borderTop: "1px solid var(--color-divider)",
                  }}
                >
                  <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{note.body}</div>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {note.authorName} · {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <AddDepartmentNoteForm departmentId={active.id} />
        </section>

        <section
          style={{
            flex: "1 1 330px",
            minWidth: 280,
            borderLeft: "2px solid var(--color-divider)",
            padding: "var(--space-6)",
          }}
        >
          <h6 style={{ margin: "0 0 var(--space-2)" }}>Documentation</h6>
          {active.docs.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 13 }}>
              No documents listed.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {active.docs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "baseline",
                    padding: "var(--space-3) 0",
                    borderTop: "1px solid var(--color-divider)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-accent)",
                      flex: "none",
                      width: 34,
                    }}
                  >
                    {doc.ext}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13 }}>{doc.name}</span>
                    <span
                      className="text-muted"
                      style={{ display: "block", fontSize: 11, marginTop: 2 }}
                    >
                      {doc.uploadedAt
                        ? `${doc.sizeLabel ? `${doc.sizeLabel} · ` : ""}uploaded ${formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}`
                        : "awaiting upload"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <hr className="hr" />
          <h6 style={{ margin: "0 0 var(--space-2)" }}>Department budget</h6>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 26 }}>
            {money(active.budgetSpent, currency)}
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            spent of {money(active.budgetAllocated, currency)} allocated
          </div>
          <div
            style={{
              height: 8,
              background: "var(--color-neutral-300)",
              marginTop: "var(--space-3)",
            }}
          >
            <div style={{ height: 8, background: "var(--color-accent)", width: `${pct}%` }} />
          </div>
        </section>
      </div>
    </div>
  );
}
