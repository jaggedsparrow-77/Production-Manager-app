import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { devLoginEnabled, githubEnabled } from "@/env";
import { getCurrentUserId } from "@/server/auth-guards";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUserId()) redirect("/shows");

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 28, letterSpacing: "-0.02em" }}>CALLBOARD</h1>
          <p className="text-muted" style={{ fontSize: 14 }}>
            Sign in to see your company&rsquo;s shows.
          </p>
        </div>

        {githubEnabled && (
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/shows" });
            }}
          >
            <SubmitButton className="btn-block" pendingLabel="Redirecting…">
              Continue with GitHub
            </SubmitButton>
          </form>
        )}

        {githubEnabled && devLoginEnabled && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: 12 }}
            className="text-muted"
          >
            <span style={{ height: 1, flex: 1, background: "var(--color-divider)" }} />
            or
            <span style={{ height: 1, flex: 1, background: "var(--color-divider)" }} />
          </div>
        )}

        {devLoginEnabled && (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("dev-login", {
                email: formData.get("email"),
                redirectTo: "/shows",
              });
            }}
            className="card"
            style={{ border: "1px dashed var(--color-accent-400)" }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent-700)" }}>
              Development sign-in — no password required. Disabled in production.
            </p>

            <Field
              label="Email"
              name="email"
              hint="Try producer@northernrep.example from the seed data."
            >
              <Input
                type="email"
                required
                placeholder="producer@northernrep.example"
                autoComplete="email"
              />
            </Field>

            <SubmitButton variant="secondary" className="btn-block" pendingLabel="Signing in…">
              Sign in
            </SubmitButton>
          </form>
        )}

        {!githubEnabled && !devLoginEnabled && (
          <div className="card" style={{ fontSize: 13 }}>
            <p style={{ fontWeight: 700 }}>No sign-in method configured</p>
            <p>
              Set <code>AUTH_GITHUB_ID</code> and <code>AUTH_GITHUB_SECRET</code>, or enable{" "}
              <code>ALLOW_DEV_LOGIN</code> for local development. See <code>.env.example</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
