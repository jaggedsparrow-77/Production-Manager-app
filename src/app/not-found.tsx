import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100dvh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 22 }}>Not found</h1>
      <p className="text-muted" style={{ fontSize: 14 }}>
        That page does not exist, or you do not have access to it.
      </p>
      <Link href="/shows" className="btn btn-secondary">
        Back to shows
      </Link>
    </main>
  );
}
