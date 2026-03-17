import { test, expect, Page } from "@playwright/test";
import {
  waitForReact,
  createUserViaApi,
  loginAs,
  checkBackendHealth,
  createPostViaApi,
  createThreadViaApi,
  acceptRequestViaApi,
  declineRequestViaApi,
  cancelRequestViaApi,
  completeThreadViaApi,
  getCurrentUserViaApi,
  deletePostViaApi,
  LOAD_TIMEOUT,
} from "./helpers";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON
// NOTE TO CLAUDE: NEVER use `if (await locator.isVisible())` - just call the action directly

// Each test creates its own unique users with timestamp
function createTestUsers(prefix: string) {
  const ts = Date.now();
  return {
    owner: {
      email: `${prefix}_owner${ts}@example.com`,
      username: `${prefix}_owner${ts}`,
      bio: "Test owner",
    },
    requester: {
      email: `${prefix}_req${ts}@example.com`,
      username: `${prefix}_req${ts}`,
      bio: "Test requester",
    },
  };
}

// Common test books
const testBooks = {
  mockingbird: { title: "To Kill a Mockingbird", author: "Harper Lee" },
  pride: { title: "Pride and Prejudice", author: "Jane Austen" },
  brave: { title: "Brave New World", author: "Aldous Huxley" },
  fahrenheit: { title: "Fahrenheit 451", author: "Ray Bradbury" },
  hobbit: { title: "The Hobbit", author: "J.R.R. Tolkien" },
  animal: { title: "Animal Farm", author: "George Orwell" },
  flies: { title: "Lord of the Flies", author: "William Golding" },
};

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await checkBackendHealth(page);
  await page.close();
});

// ============================================================================
// GIFT FLOW TESTS - Each test is independent and can run in parallel
// ============================================================================

test("Owner creates giveaway post", async ({ page }) => {
  const users = createTestUsers("create");
  await createUserViaApi(page, users.owner);
  await loginAs(page, users.owner.username);

  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Share a Book" }).click();
  await page.getByPlaceholder(/search for a book/i).fill(testBooks.mockingbird.title);
  await page.getByText(testBooks.mockingbird.author).first().click();
  await page.getByRole("button", { name: "Share Book" }).click();

  await expect(page.getByPlaceholder(/search for a book/i)).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: testBooks.mockingbird.title }),
  ).toBeVisible();
});

test("Requester can request a book", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("request");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  await createPostViaApi(page, { ...testBooks.mockingbird, type: "giveaway" });

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto(`/profile/${users.owner.username}`);
  await waitForReact(page);

  await expect(
    page.getByRole("heading", { name: testBooks.mockingbird.title }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Request", exact: true }).click();
  await page
    .getByPlaceholder(/interested in this book/i)
    .fill(`Hi! I'm interested in "${testBooks.mockingbird.title}".`);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByRole("link", { name: /you requested this/i }),
  ).toBeVisible();
});

test("Owner can accept a book request", async ({ page }) => {
  // SETUP via API (avoid "accept" in username as it matches buttons)
  const users = createTestUsers("giftacc");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.mockingbird, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await page.getByText("Someone is interested!").click();
  // Wait for interest panel to load, then click Accept
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  // Wait for dialog to appear before clicking inside it
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /yes, give/i })
    .click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Gift Completed" })).toBeVisible();
});

test("Requester sees accepted request status", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("status");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.mockingbird, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await acceptRequestViaApi(page, thread.id);

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(testBooks.mockingbird.title) }).click();

  await expect(page.getByText("Your request was accepted")).toBeVisible();
});

test("Owner can confirm gift completion", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("confirm");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.mockingbird, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await acceptRequestViaApi(page, thread.id);

  // UI TEST
  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Gift Completed" }).click();
  await page.getByRole("button", { name: "Yes, I gave it" }).click();

  await expect(page.getByRole("button", { name: "Gift Completed" })).not.toBeVisible();
});

test("Requester can confirm gift receipt", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("receipt");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.mockingbird, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await acceptRequestViaApi(page, thread.id);
  await completeThreadViaApi(page, thread.id); // Owner confirms

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(testBooks.mockingbird.title) }).click();
  await page.getByRole("button", { name: "Gift Received" }).click();
  await page.getByRole("button", { name: /yes/i }).click();

  await expect(page.getByRole("button", { name: "Gift Received" })).not.toBeVisible();
});

test("Completed gift appears in owner archive", async ({ page }) => {
  // SETUP via API - complete the entire gift flow
  const users = createTestUsers("archive");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.mockingbird, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await acceptRequestViaApi(page, thread.id);
  await completeThreadViaApi(page, thread.id);
  await loginAs(page, users.requester.username);
  await completeThreadViaApi(page, thread.id);

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  // Click the Archive tab (matches "Archive" or "Archive (N)")
  await page.getByRole("button", { name: /^Archive/ }).click();
  await expect(
    page.getByText(testBooks.mockingbird.title, { exact: false }).first(),
  ).toBeVisible();
});

test("Requester can cancel request", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("cancel");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.pride, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");

  // UI TEST
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(testBooks.pride.title) }).click();
  await page.getByRole("button", { name: "Cancel Request" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel Request" })
    .click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Requester can re-request after canceling", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("rerequest");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.pride, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await cancelRequestViaApi(page, thread.id);

  // UI TEST - re-request via owner's profile
  await page.goto(`/profile/${users.owner.username}`);
  await waitForReact(page);

  await expect(
    page.getByRole("heading", { name: testBooks.pride.title }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Request", exact: true }).click();
  await page
    .getByPlaceholder(/interested in this book/i)
    .fill("Changed my mind, I'd still like this book!");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByRole("link", { name: /you requested this/i }),
  ).toBeVisible();
});

test("Cancel history is preserved in thread", async ({ page }) => {
  // SETUP via API - cancel then re-request
  const users = createTestUsers("history");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.pride, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "First request");
  await cancelRequestViaApi(page, thread.id);
  // Re-request by sending a new message to the same thread (reopens it)
  const API_URL = process.env.API_URL || "http://localhost:3001";
  await page.request.post(
    `${API_URL}/api/messages/threads/${thread.id}/messages`,
    { data: { content: "Actually, I still want it!", type: "user" } },
  );

  // UI TEST
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(testBooks.pride.title) }).click();

  await expect(page.getByText("Request cancelled")).toBeVisible();
});

test("Owner can decline a request", async ({ page }) => {
  // SETUP via API (avoid "decline" in username as it matches buttons)
  const users = createTestUsers("decl");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.brave, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await expect(page.getByText(testBooks.brave.title).first()).toBeVisible();
  await page.getByText("Someone is interested!").first().click();
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Decline", exact: true })
    .click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Requester sees declined status and can dismiss", async ({ page }) => {
  // SETUP via API (avoid "dismiss" in username as it matches buttons)
  const users = createTestUsers("seesdecl");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.brave, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await declineRequestViaApi(page, thread.id);

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(testBooks.brave.title) }).click();
  await expect(page.getByText("Your request was declined")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();

  await expect(page.getByPlaceholder(/type a message/i)).not.toBeVisible();
});

test("Declined request banner remains visible without dismiss", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("nodismiss");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.fahrenheit, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await declineRequestViaApi(page, thread.id);

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(testBooks.fahrenheit.title) }).click();

  await expect(page.getByText("Your request was declined")).toBeVisible();
});

test("Multiple requesters: owner can accept first requester", async ({ page }) => {
  // SETUP via API
  const ts = Date.now();
  const owner = {
    email: `multi_owner${ts}@example.com`,
    username: `multi_owner${ts}`,
    bio: "Test owner",
  };
  const requester1 = {
    email: `multi_req1${ts}@example.com`,
    username: `multi_req1${ts}`,
    bio: "First requester",
  };
  const requester2 = {
    email: `multi_req2${ts}@example.com`,
    username: `multi_req2${ts}`,
    bio: "Second requester",
  };

  await createUserViaApi(page, owner);
  await createUserViaApi(page, requester1);
  await createUserViaApi(page, requester2);
  await loginAs(page, owner.username);
  const post = await createPostViaApi(page, { ...testBooks.hobbit, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, requester1.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book! - Req 1");
  await loginAs(page, requester2.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book! - Req 2");

  // UI TEST
  await loginAs(page, owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await expect(page.getByRole("button", { name: /\d+ people/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /\d+ people/i }).first().click();
  await expect(page.getByText(requester1.username)).toBeVisible();

  const req1Row = page
    .locator(".bg-gray-50.rounded-lg")
    .filter({ has: page.getByRole("link", { name: requester1.username }) });
  await req1Row.getByRole("button", { name: "Accept" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /yes, give/i })
    .click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText(new RegExp(`Giving to ${requester1.username}`)),
  ).toBeVisible();
});

test("Second requester sees 'given to someone else' after owner accepts another", async ({
  page,
}) => {
  // SETUP via API
  const ts = Date.now();
  const owner = {
    email: `other_owner${ts}@example.com`,
    username: `other_owner${ts}`,
    bio: "Test owner",
  };
  const requester1 = {
    email: `other_req1${ts}@example.com`,
    username: `other_req1${ts}`,
    bio: "First requester",
  };
  const requester2 = {
    email: `other_req2${ts}@example.com`,
    username: `other_req2${ts}`,
    bio: "Second requester",
  };

  await createUserViaApi(page, owner);
  await createUserViaApi(page, requester1);
  await createUserViaApi(page, requester2);
  await loginAs(page, owner.username);
  const post = await createPostViaApi(page, { ...testBooks.hobbit, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, requester1.username);
  const { thread: thread1 } = await createThreadViaApi(
    page,
    post.id,
    ownerData.id,
    "I'd like this book! - Req 1",
  );
  await loginAs(page, requester2.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book! - Req 2");
  await loginAs(page, owner.username);
  await acceptRequestViaApi(page, thread1.id);

  // UI TEST
  await loginAs(page, requester2.username);
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(testBooks.hobbit.title) }).click();
  await expect(page.getByText("This book was given to someone else")).toBeVisible({
    timeout: LOAD_TIMEOUT,
  });
});

test("Cannot re-request after being declined", async ({ page }) => {
  // SETUP via API - owner declines, requester dismisses
  const users = createTestUsers("norereq");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.animal, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await declineRequestViaApi(page, thread.id);
  await loginAs(page, users.requester.username);
  // Dismiss the thread via API
  const API_URL = process.env.API_URL || "http://localhost:3001";
  await page.request.patch(
    `${API_URL}/api/messages/threads/${thread.id}/status`,
    { data: { status: "dismissed" } },
  );

  // UI TEST - after dismissing, thread is viewable but can't send messages
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(testBooks.animal.title) }).click();

  await expect(page.getByText("Conversation with")).toBeVisible();
  await expect(page.locator('input[placeholder*="message" i]')).not.toBeVisible();
});

test("Requester sees 'post removed' when owner deletes post mid-conversation", async ({
  page,
}) => {
  // SETUP via API
  const users = createTestUsers("deleted");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...testBooks.flies, type: "giveaway" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like this book!");
  await loginAs(page, users.owner.username);
  await deletePostViaApi(page, post.id);

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);

  await expect(
    page.getByText(/removed|deleted|no longer available/i).first(),
  ).toBeVisible();
});
