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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        An unexpected error occurred. Try again, and if it persists, share the reference below.
      </p>
      {error.digest && <code className="font-mono text-xs text-slate-400">{error.digest}</code>}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
