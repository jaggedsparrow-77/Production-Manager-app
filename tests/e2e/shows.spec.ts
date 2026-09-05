import { expect, test } from "@playwright/test";

/**
 * End-to-end flow through the core domain: sign in, browse the portfolio,
 * work a show's tabs, toggle a task, log a decision.
 *
 * Requires a migrated + seeded database and ALLOW_DEV_LOGIN=true.
 * Run: npm run db:reset && npm run test:e2e
 */

const SEEDED_USER = "producer@northernrep.example";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");

  const devLogin = page.getByLabel("Email");
  if (!(await devLogin.isVisible().catch(() => false))) {
    test.skip(true, "Dev sign-in is disabled; set ALLOW_DEV_LOGIN=true to run this suite.");
  }

  await devLogin.fill(SEEDED_USER);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/shows$/);
});

test("shows the portfolio with the seeded productions", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "SHOWS" })).toBeVisible();
  await expect(page.getByRole("link", { name: "The Winter's Tale" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sweeney Todd" })).toBeVisible();
});

test("opens a show and walks its tabs", async ({ page }) => {
  await page.getByRole("link", { name: "The Winter's Tale" }).click();
  await expect(page).toHaveURL(/\/shows\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "The Winter's Tale" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await page.getByRole("link", { name: "Schedule" }).click();
  await expect(page.getByRole("heading", { name: "Production schedule" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Get-in & fit-up" })).toBeVisible();

  await page.getByRole("link", { name: "Meetings" }).click();
  await expect(page.getByRole("heading", { name: "Production meetings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Production meeting \d/ })).toBeVisible();

  await page.getByRole("link", { name: "Budget" }).click();
  await expect(page.getByRole("heading", { name: "Budget by department" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Lighting" })).toBeVisible();

  await page.getByRole("link", { name: "Departments" }).click();
  await expect(page.getByRole("heading", { name: "Lighting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
});

test("toggles a key task", async ({ page }) => {
  await page.getByRole("link", { name: "The Winter's Tale" }).click();

  const row = page.locator("label").filter({ hasText: "Approve replacement DPA 4061s" });
  const checkbox = row.getByRole("checkbox");
  await expect(checkbox).not.toBeChecked();

  await checkbox.check();
  await expect(checkbox).toBeChecked();
});

test("logs a decision from the header dialog", async ({ page }) => {
  await page.getByRole("button", { name: "Log a decision" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Production").selectOption({ label: "The Winter's Tale" });
  await page.getByLabel("Department").selectOption("Sound");
  await page
    .getByLabel("What was decided")
    .fill("Front-of-house paging confirmed clear of the RF scan.");
  await page.getByRole("button", { name: "Log it" }).click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("Front-of-house paging confirmed clear of the RF scan."),
  ).toBeVisible();
});
