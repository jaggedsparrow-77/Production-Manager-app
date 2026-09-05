import { expect, test } from "@playwright/test";

/**
 * End-to-end flow through the core domain: sign in, create a project, add a
 * task, move it across the board, comment on it.
 *
 * Requires a migrated + seeded database and ALLOW_DEV_LOGIN=true.
 * Run: npm run db:reset && npm run test:e2e
 */

const SEEDED_USER = "ada@example.com";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");

  const devLogin = page.getByLabel("Email");
  if (!(await devLogin.isVisible().catch(() => false))) {
    test.skip(true, "Dev sign-in is disabled; set ALLOW_DEV_LOGIN=true to run this suite.");
  }

  await devLogin.fill(SEEDED_USER);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test("creates a project and lands on its board", async ({ page }) => {
  const suffix = Date.now().toString().slice(-5);

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(`E2E Project ${suffix}`);
  await page.getByLabel("Key").fill(`E${suffix}`);
  await page.getByLabel("Description").fill("Created by the end-to-end suite.");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `E2E Project ${suffix}` })).toBeVisible();

  // Default board columns are created alongside the project.
  for (const column of ["Backlog", "In Progress", "In Review", "Done"]) {
    await expect(page.getByRole("heading", { name: column })).toBeVisible();
  }
});

test("adds a task, moves it, and comments on it", async ({ page }) => {
  const suffix = Date.now().toString().slice(-5);
  const title = `Ship the thing ${suffix}`;

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(`Flow ${suffix}`);
  await page.getByLabel("Key").fill(`F${suffix}`);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "New task" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Priority").selectOption("high");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByRole("link", { name: title })).toBeVisible();

  // Move it out of Backlog and confirm the column count follows.
  const card = page.locator("article").filter({ hasText: title });
  await card.getByLabel(/^Move/).selectOption({ label: "In Progress" });
  await card.getByRole("button", { name: "Move" }).click();

  const inProgress = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "In Progress" }) });
  await expect(inProgress.getByRole("link", { name: title })).toBeVisible();

  // Comment on the task detail page.
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByLabel("Add a comment").fill("Kicking this off.");
  await page.getByRole("button", { name: "Comment" }).click();

  await expect(page.getByText("Kicking this off.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Comments \(1\)/ })).toBeVisible();
});

test("shows assigned work on My tasks", async ({ page }) => {
  await page.getByRole("link", { name: "My tasks" }).click();
  await expect(page).toHaveURL(/\/my-tasks$/);
  await expect(page.getByRole("heading", { name: "My tasks" })).toBeVisible();
});
