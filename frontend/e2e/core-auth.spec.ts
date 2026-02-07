import { test, expect } from "@playwright/test";
import {
  waitForReact,
  createUser,
  loginAs,
  logout,
  checkBackendHealth,
  deleteAllPostsForCurrentUser,
} from "./helpers";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON

// Auth tests must run serially as they test signup/login flows
// that depend on each other
test.describe("Auth Flow Tests", () => {
  test.describe.configure({ mode: "serial" });

  // Create unique user for this test run
  const timestamp = Date.now();
  const testOwner = {
    email: `auth_owner${timestamp}@example.com`,
    username: `auth_owner${timestamp}`,
    bio: "I love sharing books with my Portland neighbors.",
  };

  test("Backend Health", async ({ page }) => {
    await checkBackendHealth(page);
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

  test("Getting Started Page - Shows for new user without posts", async ({
    page,
  }) => {
    await loginAs(page, testOwner.username);

    // Delete all posts to simulate a new user
    await deleteAllPostsForCurrentUser(page);

    // Navigate to home
    await page.goto("/");
    await waitForReact(page);

    // Should see Getting Started page, not redirect to browse
    await expect(page.locator("text=Welcome to BookShare PDX")).toBeVisible();
    await expect(page.locator("text=Set your location")).toBeVisible();
    await expect(page.locator("text=Share a book")).toBeVisible();
  });

  test("Getting Started Page - Redirects to browse when user has posts", async ({
    page,
  }) => {
    await loginAs(page, testOwner.username);

    // First ensure no posts, then create one
    await deleteAllPostsForCurrentUser(page);

    // Create a post via the share page
    await page.goto("/share?action=share");
    await waitForReact(page);

    // Click manual entry link and fill in details
    await page.locator("button:has-text(\"Can't find your book?\")").click();
    await page.fill('input[placeholder="Enter book title"]', "Test Book");
    await page.fill('input[placeholder="Enter author name"]', "Test Author");
    await page.locator('button:has-text("Use This Book")').click();

    // Now in details step - submit the share
    await page.locator('button:has-text("Share Book")').click();

    // Wait for post to be created (form collapses, post appears in list)
    await expect(page.locator("text=Test Book").first()).toBeVisible();

    // Now navigate to home - should redirect to browse
    await page.goto("/");
    await waitForReact(page);

    // Should be on browse page, not getting started
    await expect(page).toHaveURL(/\/browse/);
    await expect(
      page.locator("text=Welcome to BookShare PDX"),
    ).not.toBeVisible();
  });
});
