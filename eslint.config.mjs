import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "drizzle/**",
    "next-env.d.ts",
  ]),

  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // Unused vars are an error, but an underscore prefix marks intent.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Type-only imports keep the client bundle from pulling in server modules.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },

  // Scripts and config run outside the app; console output is the point.
  {
    files: ["src/db/seed.ts", "src/db/migrate.ts", "*.config.{ts,mjs}"],
    rules: { "no-console": "off" },
  },

  // Must stay last so formatting rules never fight Prettier.
  prettier,
]);

export default eslintConfig;
