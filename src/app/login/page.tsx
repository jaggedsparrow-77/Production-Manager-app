import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { devLoginEnabled, githubEnabled } from "@/env";
import { getCurrentUserId } from "@/server/auth-guards";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUserId()) redirect("/projects");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Production Manager</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to plan projects and track work.
          </p>
        </div>

        {githubEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/projects" });
            }}
          >
            <SubmitButton className="w-full" pendingLabel="Redirecting…">
              Continue with GitHub
            </SubmitButton>
          </form>
        )}

        {githubEnabled && devLoginEnabled && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            or
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
        )}

        {devLoginEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev-login", {
                email: formData.get("email"),
                redirectTo: "/projects",
              });
            }}
            className="space-y-4 rounded-lg border border-dashed border-amber-400 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-950/20"
          >
            <p className="text-xs font-medium text-amber-800 dark:text-amber-400">
              Development sign-in — no password required. Disabled in production.
            </p>

            <Field label="Email" name="email" hint="Try ada@example.com from the seed data.">
              <Input type="email" required placeholder="ada@example.com" autoComplete="email" />
            </Field>

            <SubmitButton variant="secondary" className="w-full" pendingLabel="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        )}

        {!githubEnabled && !devLoginEnabled && (
          <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              No sign-in method configured
            </p>
            <p className="mt-1">
              Set <code className="font-mono text-xs">AUTH_GITHUB_ID</code> and{" "}
              <code className="font-mono text-xs">AUTH_GITHUB_SECRET</code>, or enable{" "}
              <code className="font-mono text-xs">ALLOW_DEV_LOGIN</code> for local development. See{" "}
              <code className="font-mono text-xs">.env.example</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
