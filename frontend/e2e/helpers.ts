import { Page, expect, BrowserContext } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || "http://localhost:3001";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
export const LOAD_TIMEOUT = 2000;

// Auth state file paths
export const AUTH_DIR = path.join(__dirname, ".auth");
export const authFiles = {
  giftSharer: path.join(AUTH_DIR, "gift-sharer.json"),
  giftRequester: path.join(AUTH_DIR, "gift-requester.json"),
  tradeSharer: path.join(AUTH_DIR, "trade-sharer.json"),
  tradeRequester: path.join(AUTH_DIR, "trade-requester.json"),
};

export type AuthUserKey = keyof typeof authFiles;

// Load test users from global setup
function loadTestUsers() {
  const usersFile = path.join(__dirname, ".test-users.json");
  if (fs.existsSync(usersFile)) {
    return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  }
  // Fallback for when global setup hasn't run (e.g., running single test)
  const timestamp = Date.now();
  return {
    giftSharer: {
      email: `giftsharer${timestamp}@example.com`,
      username: `giftsharer${timestamp}`,
      bio: "Gift flow test sharer",
    },
    giftRequester: {
      email: `giftrequester${timestamp}@example.com`,
      username: `giftrequester${timestamp}`,
      bio: "Gift flow test requester",
    },
    tradeSharer: {
      email: `tradesharer${timestamp}@example.com`,
      username: `tradesharer${timestamp}`,
      bio: "Trade flow test sharer",
    },
    tradeRequester: {
      email: `traderequester${timestamp}@example.com`,
      username: `traderequester${timestamp}`,
      bio: "Trade flow test requester",
    },
    coreOwner: {
      email: `owner${timestamp}@example.com`,
      username: `owner${timestamp}`,
      bio: "I love sharing books with my Portland neighbors.",
    },
  };
}

export const testUsers = loadTestUsers();

// Legacy exports for core.spec.ts (which tests auth flow via UI)
export const testOwner = testUsers.coreOwner;
export const testRequester = testUsers.giftRequester;

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

// Fast auth using stored state (skips UI login)
export async function useStoredAuth(page: Page, userKey: AuthUserKey) {
  const authFile = authFiles[userKey];

  if (!fs.existsSync(authFile)) {
    // Fallback to UI login if auth file doesn't exist
    const user = testUsers[userKey];
    return loginAs(page, user.username);
  }

  // Clear existing auth
  await page.context().clearCookies();

  // Load stored state
  const state = JSON.parse(fs.readFileSync(authFile, "utf-8"));
  await page.context().addCookies(state.cookies);
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
