import Link from "next/link";
import { CheckSquare, FolderKanban, LogOut } from "lucide-react";

import { auth, signOut } from "@/auth";
import { requireUserId } from "@/server/auth-guards";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Redirects to /login when signed out; every nested page inherits the guard.
  await requireUserId();
  const session = await auth();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/projects" className="font-semibold tracking-tight">
            Production Manager
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <FolderKanban className="size-4" aria-hidden />
              Projects
            </Link>
            <Link
              href="/my-tasks"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <CheckSquare className="size-4" aria-hidden />
              My tasks
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Avatar name={session?.user?.name} image={session?.user?.image} />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm" title="Sign out">
                <LogOut className="size-4" aria-hidden />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
