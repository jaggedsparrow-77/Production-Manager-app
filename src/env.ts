import { z } from "zod";

/**
 * Validated environment. Import `env` instead of touching `process.env`
 * directly so a missing or malformed variable fails at boot with a readable
 * message rather than as `undefined` deep inside a request handler.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required. Generate one with: npx auth secret"),
  AUTH_URL: z.url().optional(),

  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  ALLOW_DEV_LOGIN: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

function load() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${details}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
  }

  const env = parsed.data;

  // A password-less login form must never exist in a deployed environment.
  // Refusing to boot is louder — and safer — than silently ignoring the flag.
  //
  // `next build` also runs with NODE_ENV=production, and a developer who has
  // ALLOW_DEV_LOGIN set locally must still be able to build. The build phase is
  // excluded because nothing is being served: the flag only becomes dangerous
  // when a server accepts requests, which is exactly what this still catches.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (env.NODE_ENV === "production" && env.ALLOW_DEV_LOGIN && !isBuildPhase) {
    throw new Error(
      "ALLOW_DEV_LOGIN must not be enabled in production. Unset it in the deployment environment.",
    );
  }

  return env;
}

export const env = load();

/** True only when the dev sign-in form is both permitted and non-production. */
export const devLoginEnabled = env.ALLOW_DEV_LOGIN && env.NODE_ENV !== "production";

/** GitHub OAuth is optional; the login page hides the button when unset. */
export const githubEnabled = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);
