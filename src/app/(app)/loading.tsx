function Skeleton({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--color-neutral-200)",
        animation: "pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export default function Loading() {
  return (
    <div
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
      aria-busy
      role="status"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton style={{ height: 32, width: 200 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} style={{ height: 140 }} />
        ))}
      </div>
    </div>
  );
}
