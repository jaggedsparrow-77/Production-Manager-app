import Link from "next/link";
import { LogOut } from "lucide-react";
import { getISOWeek } from "date-fns";

import { auth, signOut } from "@/auth";
import { getCurrentOrganization, listShowsForNav } from "@/server/queries";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DecisionDialogButton } from "@/components/decision-dialog";
import { ShowNavList, ShowsNavLink } from "@/components/show-nav-list";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, organization, shows] = await Promise.all([
    auth(),
    getCurrentOrganization(),
    listShowsForNav(),
  ]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "2px solid var(--color-divider)",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/shows"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.02em",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          CALLBOARD
        </Link>
        <div
          className="text-muted"
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            borderLeft: "1px solid var(--color-divider)",
            paddingLeft: "var(--space-4)",
          }}
        >
          {organization.name}
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <span className="text-muted" style={{ fontSize: 12 }}>
            Week {getISOWeek(today)} · {dateLabel}
          </span>
          <DecisionDialogButton shows={shows.map((s) => ({ id: s.id, title: s.title }))} />
          <Avatar name={session?.user?.name} image={session?.user?.image} size={30} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" className="btn-icon" title="Sign out">
              <LogOut size={16} aria-hidden />
              <span className="sr-only">Sign out</span>
            </Button>
          </form>
        </div>
      </header>

      <div
        style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", flex: 1, minHeight: 0 }}
      >
        <aside
          style={{
            flex: "1 1 238px",
            maxWidth: 300,
            minWidth: 200,
            borderRight: "2px solid var(--color-divider)",
            padding: "var(--space-4) 0",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column" }}>
            <ShowsNavLink />
          </nav>

          <div>
            <h6
              className="text-muted"
              style={{ margin: "0 0 var(--space-2)", padding: "0 var(--space-4)" }}
            >
              Productions
            </h6>
            <ShowNavList shows={shows} />
          </div>

          <div
            style={{
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--color-divider)",
            }}
          >
            <button
              disabled
              title="Not implemented yet"
              style={{
                all: "unset",
                cursor: "not-allowed",
                opacity: 0.45,
                padding: "7px var(--space-4)",
                fontSize: 13,
              }}
            >
              Schedule templates
            </button>
            <button
              disabled
              title="Not implemented yet"
              style={{
                all: "unset",
                cursor: "not-allowed",
                opacity: 0.45,
                padding: "7px var(--space-4)",
                fontSize: 13,
              }}
            >
              Budget templates
            </button>
            <Link
              href="/company"
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "7px var(--space-4)",
                fontSize: 13,
              }}
            >
              Company &amp; crew
            </Link>
          </div>
        </aside>

        <main style={{ flex: "1 1 620px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
