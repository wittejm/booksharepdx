import { test, expect } from "@playwright/test";
import {
  waitForReact,
  createUser,
  loginAs,
  logout,
  checkBackendHealth,
  testOwner,
} from "./helpers";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON

test.describe("Core Tests", () => {
  test.describe.configure({ mode: "serial" }); // Tests depend on each other

  test("Backend Health", async ({ page }) => {
    await checkBackendHealth(page);
  });

  test("Landing Page", async ({ page }) => {
    await page.goto("/");
    await waitForReact(page);

    await expect(page).toHaveTitle(/BookShare/);
    // Multiple signup links exist - just check at least one is visible
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
    await expect(page.locator('a[href="/browse"]').first()).toBeVisible();
  });

  test("Signup Flow", async ({ page }) => {
    await page.goto("/signup");
    await waitForReact(page);

    // Check form elements exist
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="username"]')).toBeVisible();
    await expect(page.locator('textarea[id="bio"]')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Fill and submit
    await createUser(page, testOwner);

    // Should redirect away from signup on success
    await expect(page).not.toHaveURL(/\/signup/);
  });

  test("Login Flow", async ({ page }) => {
    await logout(page);
    await page.goto("/login");
    await waitForReact(page);

    await expect(page).toHaveURL(/\/login/);

    const identifierInput = page.locator('input[id="identifier"]');
    await expect(identifierInput).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Login with username
    await identifierInput.fill(testOwner.username);
    await page.click('button[type="submit"]');

    // Should navigate away from login or show "check email" message
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Browse Page", async ({ page }) => {
    await page.goto("/browse");
    await waitForReact(page);

    // Should have browse content
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).toContain("browse");
  });

  test("Profile Page", async ({ page }) => {
    await page.goto(`/profile/${testOwner.username}`);
    await waitForReact(page);

    // Wait for profile to load (username should appear)
    await expect(
      page.locator(`text=${testOwner.username}`).first(),
    ).toBeVisible();
  });

  test("Share Page Load", async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto("/share");
    await waitForReact(page);

    // Should load without error - look for the Share a Book button
    await expect(
      page.getByRole("button", { name: "Share a Book" }),
    ).toBeVisible();
  });

  test("Create Giveaway Post Form", async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto("/share");
    await waitForReact(page);

    // Click to expand form
    await page.getByRole("button", { name: "Share a Book" }).click();

    // Wait for form to appear
    await expect(
      page.locator('input[placeholder*="Search for a book" i]'),
    ).toBeVisible();
  });

  test("Responsive Design", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await waitForReact(page);

    await page.goto("/browse");
    await waitForReact(page);

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Activity Page Mobile - Thread List Visible When No Conversation Selected", async ({
    page,
  }) => {
    await loginAs(page, testOwner.username);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/activity");
    await waitForReact(page);

    // The thread list container should be visible on mobile when no conversation is selected
    // It contains either "No activity yet" or the list of threads
    const threadListContainer = page
      .locator('text="No activity yet"')
      .or(page.locator('text="Start a conversation"'));
    await expect(threadListContainer.first()).toBeVisible();

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Navigation", async ({ page }) => {
    await page.goto("/");
    await waitForReact(page);

    // Check key navigation links exist
    await expect(
      page.getByRole("link", { name: "Browse", exact: true }),
    ).toBeVisible();
  });

  test("404 Page", async ({ page }) => {
    await page.goto("/nonexistent-page-12345");
    await waitForReact(page);
    // Should show some kind of content (not crash)
  });
});
