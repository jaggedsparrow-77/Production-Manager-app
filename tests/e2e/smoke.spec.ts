import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the signed-out surface. These run against a real server
 * but need no database rows, so they stay green in a bare CI environment.
 *
 * Signed-in flows live in shows.spec.ts and require a seeded database.
 */

test("redirects an anonymous visitor to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "CALLBOARD" })).toBeVisible();
});

test("guards the shows page", async ({ page }) => {
  await page.goto("/shows");
  await expect(page).toHaveURL(/\/login/);
});

test("sets baseline security headers", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
});
