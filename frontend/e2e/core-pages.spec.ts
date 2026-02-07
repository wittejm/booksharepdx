import { test, expect } from "@playwright/test";
import {
  waitForReact,
  createUserViaApi,
  loginAs,
  checkBackendHealth,
} from "./helpers";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON

// Page rendering tests can run in parallel - each test is independent
// and creates its own user when needed

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await checkBackendHealth(page);
  await page.close();
});

test("Landing Page", async ({ page }) => {
  await page.goto("/");
  await waitForReact(page);

  await expect(page).toHaveTitle(/BookShare/);
  // Multiple signup links exist - just check at least one is visible
  await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
  await expect(page.locator('a[href="/browse"]').first()).toBeVisible();
});

test("Browse Page", async ({ page }) => {
  await page.goto("/browse");
  await waitForReact(page);

  // Should have browse content
  const pageContent = await page.content();
  expect(pageContent.toLowerCase()).toContain("browse");
});

test("Profile Page", async ({ page }) => {
  // Create a user to view their profile
  const ts = Date.now();
  const user = {
    email: `profile_test${ts}@example.com`,
    username: `profile_test${ts}`,
    bio: "Test user bio",
  };
  await createUserViaApi(page, user);

  await page.goto(`/profile/${user.username}`);
  await waitForReact(page);

  // Wait for profile to load (username should appear)
  await expect(page.locator(`text=${user.username}`).first()).toBeVisible();
});

test("Share Page Load", async ({ page }) => {
  // Create and login a user
  const ts = Date.now();
  const user = {
    email: `share_test${ts}@example.com`,
    username: `share_test${ts}`,
    bio: "Test user for share page",
  };
  await createUserViaApi(page, user);
  await loginAs(page, user.username);

  await page.goto("/share");
  await waitForReact(page);

  // Should load without error - look for the Share a Book button
  await expect(
    page.getByRole("button", { name: "Share a Book" }),
  ).toBeVisible();
});

test("Create Giveaway Post Form", async ({ page }) => {
  // Create and login a user
  const ts = Date.now();
  const user = {
    email: `form_test${ts}@example.com`,
    username: `form_test${ts}`,
    bio: "Test user for form",
  };
  await createUserViaApi(page, user);
  await loginAs(page, user.username);

  await page.goto("/share");
  await waitForReact(page);

  // Click to expand form
  await page.getByRole("button", { name: "Share a Book" }).click();

  // Wait for form to appear
  await expect(
    page.locator('input[placeholder*="Search for a book" i]'),
  ).toBeVisible();
});

test("Responsive Design - Mobile", async ({ page }) => {
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
  // Create and login a user
  const ts = Date.now();
  const user = {
    email: `activity_test${ts}@example.com`,
    username: `activity_test${ts}`,
    bio: "Test user for activity",
  };
  await createUserViaApi(page, user);
  await loginAs(page, user.username);

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
