import { test, expect, Page } from "@playwright/test";
import {
  waitForReact,
  createUserViaApi,
  loginAs,
  checkBackendHealth,
  createPostViaApi,
  createThreadViaApi,
  getCurrentUserViaApi,
  proposeTradeViaApi,
  acceptTradeViaApi,
  completeThreadViaApi,
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

// Common test books for trades
const tradeBooks = {
  gatsby: { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  nineteen84: { title: "Nineteen Eighty-Four", author: "George Orwell" },
  catcher: { title: "The Catcher in the Rye", author: "J.D. Salinger" },
  grapes: { title: "The Grapes of Wrath", author: "John Steinbeck" },
};

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await checkBackendHealth(page);
  await page.close();
});

// ============================================================================
// TRADE FLOW TESTS - Each test is independent and can run in parallel
// ============================================================================

test("Owner creates exchange post", async ({ page }) => {
  const users = createTestUsers("create_ex");
  await createUserViaApi(page, users.owner);
  await loginAs(page, users.owner.username);

  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Share a Book" }).click();
  await page.getByPlaceholder(/search for a book/i).fill(tradeBooks.gatsby.title);
  await page.getByText(tradeBooks.gatsby.author).first().click();
  await page.getByRole("button", { name: "Exchange" }).click();
  await page.getByRole("button", { name: "Share Book" }).click();

  await expect(page.getByPlaceholder(/search for a book/i)).not.toBeVisible();
  await expect(page.getByText(tradeBooks.gatsby.title, { exact: false }).first()).toBeVisible();
});

test("Requester can request owner's exchange book", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("req_ex");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto(`/profile/${users.owner.username}`);
  await waitForReact(page);

  await expect(page.getByRole("heading", { name: tradeBooks.gatsby.title })).toBeVisible();
  const bookCard = page.locator("div").filter({
    has: page.getByRole("heading", { name: tradeBooks.gatsby.title }),
  });
  await bookCard.getByRole("button", { name: "Request", exact: true }).click();
  await page
    .getByPlaceholder(/interested in this book/i)
    .fill(`Hi! I'm interested in "${tradeBooks.gatsby.title}". Would love to trade!`);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByPlaceholder(/interested in this book/i)).not.toBeVisible();
});

test("Owner sees interest and can navigate to requester profile", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("nav_prof");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  await createThreadViaApi(page, post.id, ownerData.id, "I'd like to trade for this!");

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await page.getByText("Someone is interested!").click();
  await page.getByRole("link", { name: "View Books" }).click();
  await waitForReact(page);

  await expect(page.getByText(users.requester.username, { exact: false }).first()).toBeVisible();
});

test("Owner can propose exchange from requester's profile", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("propose");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  await createThreadViaApi(page, ownerPost.id, ownerData.id, "I'd like to trade for this!");

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto(`/profile/${users.requester.username}`);
  await waitForReact(page);

  await page.getByRole("button", { name: "Exchange" }).click();
  await page.getByRole("button", { name: "Propose Exchange" }).click();

  await expect(page.getByRole("button", { name: "Exchange" })).not.toBeVisible();
});

test("Requester can accept trade proposal", async ({ page }) => {
  // SETUP via API (avoid "accept" in username as it matches buttons)
  const users = createTestUsers("takeprop");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const requesterPost = await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  const { thread } = await createThreadViaApi(
    page,
    ownerPost.id,
    ownerData.id,
    "I'd like to trade for this!",
  );
  await loginAs(page, users.owner.username);
  await proposeTradeViaApi(page, thread.id, ownerPost.id, requesterPost.id);

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(tradeBooks.gatsby.title) }).click();
  // Accept the trade proposal - use exact match to avoid matching avatar buttons
  await page.getByRole("button", { name: "Accept", exact: true }).click();

  await expect(page.getByRole("button", { name: "Trade Completed" })).toBeVisible();
});

test("Both users see confirm buttons after trade acceptance", async ({ page }) => {
  // SETUP via API - complete trade acceptance
  const users = createTestUsers("confirm_tr");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const requesterPost = await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  const { thread } = await createThreadViaApi(
    page,
    ownerPost.id,
    ownerData.id,
    "I'd like to trade for this!",
  );
  await loginAs(page, users.owner.username);
  const proposal = await proposeTradeViaApi(page, thread.id, ownerPost.id, requesterPost.id);
  await loginAs(page, users.requester.username);
  await acceptTradeViaApi(page, thread.id, proposal.id);

  // UI TEST - Check requester sees Trade Completed
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(tradeBooks.gatsby.title) }).click();
  await expect(page.getByRole("button", { name: "Trade Completed" })).toBeVisible();

  // Check owner sees Gift Completed
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);
  await expect(page.getByRole("button", { name: "Gift Completed" })).toBeVisible();
});

test("Book no longer appears in browse after trade accepted", async ({ page }) => {
  // SETUP via API - complete trade acceptance
  const users = createTestUsers("browse_tr");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const requesterPost = await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  const { thread } = await createThreadViaApi(
    page,
    ownerPost.id,
    ownerData.id,
    "I'd like to trade for this!",
  );
  await loginAs(page, users.owner.username);
  const proposal = await proposeTradeViaApi(page, thread.id, ownerPost.id, requesterPost.id);
  await loginAs(page, users.requester.username);
  await acceptTradeViaApi(page, thread.id, proposal.id);

  // UI TEST
  await page.goto("/browse");
  await waitForReact(page);

  await page.getByPlaceholder(/title|search/i).fill(tradeBooks.gatsby.title);
  await expect(page.getByRole("link", { name: users.owner.username })).not.toBeVisible();
});

test("Owner can confirm trade completion", async ({ page }) => {
  // SETUP via API - complete trade acceptance
  const users = createTestUsers("owner_conf");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const requesterPost = await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  const { thread } = await createThreadViaApi(
    page,
    ownerPost.id,
    ownerData.id,
    "I'd like to trade for this!",
  );
  await loginAs(page, users.owner.username);
  const proposal = await proposeTradeViaApi(page, thread.id, ownerPost.id, requesterPost.id);
  await loginAs(page, users.requester.username);
  await acceptTradeViaApi(page, thread.id, proposal.id);

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Gift Completed" }).click();
  await page.getByRole("button", { name: /yes, i gave it|yes/i }).click();

  await expect(page.getByRole("button", { name: "Gift Completed" })).not.toBeVisible();
});

test("Requester can confirm trade receipt", async ({ page }) => {
  // SETUP via API - complete trade acceptance + owner confirms
  const users = createTestUsers("req_conf");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const requesterPost = await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  const { thread } = await createThreadViaApi(
    page,
    ownerPost.id,
    ownerData.id,
    "I'd like to trade for this!",
  );
  await loginAs(page, users.owner.username);
  const proposal = await proposeTradeViaApi(page, thread.id, ownerPost.id, requesterPost.id);
  await loginAs(page, users.requester.username);
  await acceptTradeViaApi(page, thread.id, proposal.id);
  await loginAs(page, users.owner.username);
  await completeThreadViaApi(page, thread.id);

  // UI TEST
  await loginAs(page, users.requester.username);
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(tradeBooks.gatsby.title) }).click();
  await page.getByRole("button", { name: "Trade Completed" }).click();
  await page.getByRole("button", { name: /yes, trade completed|yes/i }).click();

  await expect(page.getByRole("button", { name: "Trade Completed" })).not.toBeVisible();
});

test("Completed trade moves to owner archive", async ({ page }) => {
  // SETUP via API - complete entire trade flow
  const users = createTestUsers("archive_tr");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.requester);
  await loginAs(page, users.owner.username);
  const ownerPost = await createPostViaApi(page, { ...tradeBooks.gatsby, type: "exchange" });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.requester.username);
  const requesterPost = await createPostViaApi(page, { ...tradeBooks.nineteen84, type: "exchange" });
  const { thread } = await createThreadViaApi(
    page,
    ownerPost.id,
    ownerData.id,
    "I'd like to trade for this!",
  );
  await loginAs(page, users.owner.username);
  const proposal = await proposeTradeViaApi(page, thread.id, ownerPost.id, requesterPost.id);
  await loginAs(page, users.requester.username);
  await acceptTradeViaApi(page, thread.id, proposal.id);
  await loginAs(page, users.owner.username);
  await completeThreadViaApi(page, thread.id);
  await loginAs(page, users.requester.username);
  await completeThreadViaApi(page, thread.id);

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  // Click the Active tab to verify book isn't there
  await page.getByRole("button", { name: /^Active/ }).click();
  await expect(page.getByText(tradeBooks.gatsby.title, { exact: false }).first()).not.toBeVisible();

  // Click the Archive tab (matches "Archive" or "Archive (N)")
  await page.getByRole("button", { name: /^Archive/ }).click();
  await expect(page.getByText(tradeBooks.gatsby.title, { exact: false }).first()).toBeVisible();
});
