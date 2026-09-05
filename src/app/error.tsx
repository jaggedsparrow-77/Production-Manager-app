"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Next.js strips the message in production builds, so
 * the digest is the only handle for correlating a report with server logs.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100dvh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
        padding: "var(--space-4)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
      <p className="text-muted" style={{ maxWidth: 420, fontSize: 14 }}>
        An unexpected error occurred. Try again, and if it persists, share the reference below.
      </p>
      {error.digest && (
        <code className="text-muted" style={{ fontSize: 11 }}>
          {error.digest}
        </code>
      )}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
