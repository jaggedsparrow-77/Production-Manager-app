import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        That page does not exist, or you do not have access to it.
      </p>
      <Link href="/projects" className="text-sm underline underline-offset-4">
        Back to projects
      </Link>
    </main>
  );
}
