import { Page, expect } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
export const LOAD_TIMEOUT = 2000;

// Unique test users for this run
const timestamp = Date.now();
export const testOwner = {
  email: `owner${timestamp}@example.com`,
  username: `owner${timestamp}`,
  bio: "I love sharing books with my Portland neighbors.",
};
export const testRequester = {
  email: `requester${timestamp}@example.com`,
  username: `requester${timestamp}`,
  bio: "Always looking for good reads!",
};

export async function waitForReact(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector('h1, h2, form, [class*="container"], main, nav', {
    timeout: LOAD_TIMEOUT,
  });
}

export async function createUser(page: Page, user: typeof testOwner) {
  // Ensure page is settled before navigation
  await page.waitForLoadState("load");
  await page.goto("/signup", { waitUntil: "domcontentloaded" });
  await waitForReact(page);
  await page.fill('input[id="email"]', user.email);
  await page.fill('input[id="username"]', user.username);
  await page.fill('textarea[id="bio"]', user.bio);
  await page.click('input[type="checkbox"]');
  await page.click('button[type="submit"]');
  // Wait for navigation away from signup page
  await expect(page).not.toHaveURL(/\/signup/, { timeout: LOAD_TIMEOUT });
}

export async function loginAs(page: Page, identifier: string) {
  // Start from home page
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForReact(page);

  const profileButton = page.locator("button:has(.rounded-full)");
  const loginLink = page.locator('a[href="/login"]');

  const isLoggedIn = await profileButton
    .isVisible({ timeout: 500 })
    .catch(() => false);

  if (isLoggedIn) {
    // Logout flow
    await profileButton.click();
    await page.locator('button:has-text("Logout")').click();
    // Wait for TWO specific conditions proving logout is complete:
    await expect(loginLink).toBeVisible({ timeout: LOAD_TIMEOUT });
    await expect(profileButton).not.toBeVisible({ timeout: LOAD_TIMEOUT });
  }

  // Navigate to login by clicking the link (not goto - avoids racing with any redirect)
  // The link should be visible whether we just logged out or were already logged out
  await expect(loginLink).toBeVisible({ timeout: LOAD_TIMEOUT });
  await loginLink.click();
  await page.waitForURL(/\/login/, { timeout: LOAD_TIMEOUT });

  // Wait for login form to be ready
  const identifierInput = page.locator('input[id="identifier"]');
  await expect(identifierInput).toBeVisible({ timeout: LOAD_TIMEOUT });

  // Fill and submit
  await identifierInput.fill(identifier);
  await page.click('button[type="submit"]');

  // Wait for login to complete AND verify we're actually logged in
  await expect(page).not.toHaveURL(/\/login/, { timeout: LOAD_TIMEOUT });
  await expect(profileButton).toBeVisible({ timeout: LOAD_TIMEOUT });
}

export async function logout(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForReact(page);

  const profileButton = page.locator("button:has(.rounded-full)");
  const isLoggedIn = await profileButton
    .isVisible({ timeout: 500 })
    .catch(() => false);

  if (isLoggedIn) {
    await profileButton.click();
    await page.locator('button:has-text("Logout")').click();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  }
  // Ensure page is settled before next navigation
  await page.waitForLoadState("load");
}

export async function checkBackendHealth(page: Page) {
  const response = await page.request.get(`${API_URL}/api/posts`);
  expect(response.ok()).toBe(true);
}

// Fast user creation via API (no UI navigation)
export async function createUserViaApi(
  page: Page,
  user: { email: string; username: string; bio: string },
) {
  const response = await page.request.post(`${API_URL}/api/auth/signup`, {
    data: {
      email: user.email,
      username: user.username,
      bio: user.bio,
    },
  });
  expect(response.ok(), `Failed to create user ${user.username}`).toBe(true);
}

export async function deleteAllPostsForCurrentUser(page: Page) {
  // Get current user
  const meResponse = await page.request.get(`${API_URL}/api/auth/me`);
  if (!meResponse.ok()) return;

  const { data: user } = await meResponse.json();

  // Get all their posts
  const postsResponse = await page.request.get(
    `${API_URL}/api/posts?userId=${user.id}`,
  );
  if (!postsResponse.ok()) return;

  const { data: posts } = await postsResponse.json();

  // Delete each post
  for (const post of posts) {
    await page.request.delete(`${API_URL}/api/posts/${post.id}`);
  }
}
