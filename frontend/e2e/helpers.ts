import { Page, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
const LOAD_TIMEOUT = 2000;

// Unique test users for this run
const timestamp = Date.now();
export const testOwner = {
  email: `owner${timestamp}@example.com`,
  username: `owner${timestamp}`,
  bio: 'I love sharing books with my Portland neighbors.',
};
export const testRequester = {
  email: `requester${timestamp}@example.com`,
  username: `requester${timestamp}`,
  bio: 'Always looking for good reads!',
};

export async function waitForReact(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('h1, h2, form, [class*="container"], main, nav', { timeout: LOAD_TIMEOUT });
}

export async function createUser(page: Page, user: typeof testOwner) {
  await page.goto('/signup');
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
  // Always logout first to ensure we switch users
  await page.goto('/');
  await waitForReact(page);

  const profileButton = page.locator('button:has(.rounded-full)');
  const isLoggedIn = await profileButton.isVisible({ timeout: 500 }).catch(() => false);

  if (isLoggedIn) {
    await profileButton.click();
    await page.locator('button:has-text("Logout")').click();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  }

  await page.goto('/login');
  await waitForReact(page);
  await page.locator('input[id="identifier"]').fill(identifier);
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: LOAD_TIMEOUT });
}

export async function logout(page: Page) {
  await page.goto('/');
  await waitForReact(page);

  const profileButton = page.locator('button:has(.rounded-full)');
  const isLoggedIn = await profileButton.isVisible({ timeout: 500 }).catch(() => false);

  if (isLoggedIn) {
    await profileButton.click();
    await page.locator('button:has-text("Logout")').click();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  }
}

export async function checkBackendHealth(page: Page) {
  const response = await page.request.get(`${API_URL}/api/posts`);
  expect(response.ok()).toBe(true);
}
