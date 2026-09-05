/**
 * Loads .env.local for standalone scripts (migrate, seed, drizzle-kit), which
 * run outside Next.js and so get no env loading for free.
 *
 * The file is absent in CI, where variables come from the environment already —
 * and `process.loadEnvFile` throws on a missing file, so this swallows that one
 * case rather than letting it fail the job.
 */
export function loadEnvLocal(path = ".env.local") {
  try {
    process.loadEnvFile(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}
