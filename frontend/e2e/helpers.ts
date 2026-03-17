import { Page, expect } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
export const LOAD_TIMEOUT = 2000;
// API calls get slightly more time - network requests have more variance than UI
const API_TIMEOUT = 5000;

export async function waitForReact(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector('h1, h2, form, [class*="container"], main, nav', {
    timeout: LOAD_TIMEOUT,
  });
}

export async function createUser(
  page: Page,
  user: { email: string; username: string; bio: string },
) {
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
    timeout: API_TIMEOUT,
  });
  expect(response.ok(), `Failed to create user ${user.username}`).toBe(true);
}

// Fast login via API - sets cookies directly without UI navigation
// Only works in dev mode (EMAIL_VERIFICATION_ENABLED=false)
export async function loginViaApi(page: Page, identifier: string) {
  const response = await page.request.post(`${API_URL}/api/auth/send-magic-link`, {
    data: { identifier },
    timeout: API_TIMEOUT,
  });
  expect(response.ok(), `Failed to login ${identifier}`).toBe(true);
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

// ============================================================================
// API Helpers for Independent Tests
// These functions allow tests to set up state quickly via API calls instead of UI
// ============================================================================

export interface PostData {
  id: string;
  userId: string;
  bookId: string;
  type: "giveaway" | "exchange" | "loan";
  status: string;
  book: {
    id: string;
    title: string;
    author: string;
  };
}

export interface ThreadData {
  id: string;
  postId: string;
  participants: string[];
  status: string;
}

export interface MessageData {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  type: string;
}

export interface UserData {
  id: string;
  username: string;
  email: string;
}

// Get current user's ID and username via API
export async function getCurrentUserViaApi(page: Page): Promise<UserData> {
  const response = await page.request.get(`${API_URL}/api/auth/me`, {
    timeout: API_TIMEOUT,
  });
  expect(response.ok(), "Failed to get current user").toBe(true);
  const { data } = await response.json();
  return { id: data.id, username: data.username, email: data.email };
}

// Create a book post via API
export async function createPostViaApi(
  page: Page,
  options: {
    title: string;
    author: string;
    type: "giveaway" | "exchange" | "loan";
    loanDuration?: number;
  },
): Promise<PostData> {
  const response = await page.request.post(`${API_URL}/api/posts`, {
    data: {
      book: {
        title: options.title,
        author: options.author,
      },
      type: options.type,
      ...(options.loanDuration !== undefined && { loanDuration: options.loanDuration }),
    },
    timeout: API_TIMEOUT,
  });
  expect(response.ok(), `Failed to create post for "${options.title}"`).toBe(
    true,
  );
  const { data } = await response.json();
  return data;
}

// Create a message thread (express interest in a book) via API
export async function createThreadViaApi(
  page: Page,
  postId: string,
  ownerId: string,
  message: string,
): Promise<{ thread: ThreadData; message: MessageData }> {
  // First create the thread
  const threadResponse = await page.request.post(
    `${API_URL}/api/messages/threads`,
    {
      data: {
        postId,
        recipientId: ownerId,
      },
      timeout: API_TIMEOUT,
    },
  );
  expect(threadResponse.ok(), "Failed to create thread").toBe(true);
  const { data: thread } = await threadResponse.json();

  // Then send the first message
  const messageResponse = await page.request.post(
    `${API_URL}/api/messages/threads/${thread.id}/messages`,
    {
      data: {
        content: message,
        type: "user",
      },
      timeout: API_TIMEOUT,
    },
  );
  expect(messageResponse.ok(), "Failed to send message").toBe(true);
  const { data: messageData } = await messageResponse.json();

  return { thread, message: messageData };
}

// Accept a book request (owner action) via API
export async function acceptRequestViaApi(
  page: Page,
  threadId: string,
): Promise<ThreadData> {
  const response = await page.request.patch(
    `${API_URL}/api/messages/threads/${threadId}/status`,
    {
      data: { status: "accepted" },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to accept request").toBe(true);
  const { data } = await response.json();
  return data;
}

// Decline a book request (owner action) via API
export async function declineRequestViaApi(
  page: Page,
  threadId: string,
): Promise<ThreadData> {
  const response = await page.request.patch(
    `${API_URL}/api/messages/threads/${threadId}/status`,
    {
      data: { status: "declined_by_owner" },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to decline request").toBe(true);
  const { data } = await response.json();
  return data;
}

// Cancel a request (requester action) via API
export async function cancelRequestViaApi(
  page: Page,
  threadId: string,
): Promise<ThreadData> {
  const response = await page.request.patch(
    `${API_URL}/api/messages/threads/${threadId}/status`,
    {
      data: { status: "cancelled_by_requester" },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to cancel request").toBe(true);
  const { data } = await response.json();
  return data;
}

// Propose a trade (exchange) via API
export async function proposeTradeViaApi(
  page: Page,
  threadId: string,
  offeredPostId: string,
  requestedPostId: string,
): Promise<MessageData> {
  const response = await page.request.post(
    `${API_URL}/api/messages/threads/${threadId}/messages`,
    {
      data: {
        content: "",
        type: "trade_proposal",
        offeredPostId,
        requestedPostId,
      },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to propose trade").toBe(true);
  const { data } = await response.json();
  return data;
}

// Accept a trade proposal via API
export async function acceptTradeViaApi(
  page: Page,
  threadId: string,
  messageId: string,
): Promise<{ proposalMessage: MessageData; thread: ThreadData }> {
  const response = await page.request.post(
    `${API_URL}/api/messages/threads/${threadId}/respond-proposal`,
    {
      data: {
        messageId,
        response: "accept",
      },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to accept trade").toBe(true);
  const { data } = await response.json();
  return data;
}

// Decline a trade proposal via API
export async function declineTradeViaApi(
  page: Page,
  threadId: string,
  messageId: string,
): Promise<{ proposalMessage: MessageData; thread: ThreadData }> {
  const response = await page.request.post(
    `${API_URL}/api/messages/threads/${threadId}/respond-proposal`,
    {
      data: {
        messageId,
        response: "decline",
      },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to decline trade").toBe(true);
  const { data } = await response.json();
  return data;
}

// Mark gift/trade as complete via API
export async function completeThreadViaApi(
  page: Page,
  threadId: string,
): Promise<ThreadData> {
  const response = await page.request.post(
    `${API_URL}/api/messages/threads/${threadId}/complete`,
    { timeout: API_TIMEOUT },
  );
  expect(response.ok(), "Failed to complete thread").toBe(true);
  const { data } = await response.json();
  return data;
}

// Delete a post via API
export async function deletePostViaApi(page: Page, postId: string): Promise<void> {
  const response = await page.request.delete(`${API_URL}/api/posts/${postId}`, {
    timeout: API_TIMEOUT,
  });
  expect(response.ok(), "Failed to delete post").toBe(true);
}

// Dismiss a thread (for declined/cancelled requests) via API
export async function dismissThreadViaApi(
  page: Page,
  threadId: string,
): Promise<ThreadData> {
  const response = await page.request.patch(
    `${API_URL}/api/messages/threads/${threadId}/status`,
    {
      data: { status: "dismissed" },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to dismiss thread").toBe(true);
  const { data } = await response.json();
  return data;
}

// Accept a loan request (owner action) via API - sets loanDueDate
export async function acceptLoanViaApi(
  page: Page,
  threadId: string,
  loanDueDays: number = 30,
): Promise<ThreadData> {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDueDays);
  const response = await page.request.patch(
    `${API_URL}/api/messages/threads/${threadId}/status`,
    {
      data: { status: "accepted", loanDueDate: dueDate.getTime() },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to accept loan request").toBe(true);
  const { data } = await response.json();
  return data;
}

// Confirm loan return via API
export async function confirmReturnViaApi(
  page: Page,
  threadId: string,
  relistPost?: boolean,
): Promise<{ bothConfirmedReturn: boolean }> {
  const response = await page.request.post(
    `${API_URL}/api/messages/threads/${threadId}/confirm-return`,
    {
      data: { relistPost },
      timeout: API_TIMEOUT,
    },
  );
  expect(response.ok(), "Failed to confirm return").toBe(true);
  const { data } = await response.json();
  return data;
}
