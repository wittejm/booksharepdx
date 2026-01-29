import { test, expect, Page } from "@playwright/test";
import {
  waitForReact,
  useStoredAuth,
  checkBackendHealth,
  testUsers,
} from "./helpers";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON
// NOTE TO CLAUDE: NEVER use `if (await locator.isVisible())` - just call the action directly

// Use shared users from global setup
const tradeTestSharer = testUsers.tradeSharer;
const tradeTestRequester = testUsers.tradeRequester;

const tradeTestOwnerBook = {
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
};

const tradeTestRequesterBook = {
  title: "Nineteen Eighty-Four",
  author: "George Orwell",
};

async function createExchangePost(
  page: Page,
  bookTitle: string,
  bookAuthor: string,
): Promise<void> {
  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Share a Book" }).click();
  await page.getByPlaceholder(/search for a book/i).fill(bookTitle);
  await page.getByText(bookAuthor).first().click();
  await page.getByRole("button", { name: "Exchange" }).click();
  await page.getByRole("button", { name: "Share Book" }).click();

  // Wait for the share form to close and post to appear
  await expect(page.getByPlaceholder(/search for a book/i)).not.toBeVisible();
  await expect(
    page.getByText(bookTitle, { exact: false }).first(),
  ).toBeVisible();
}

async function sendRequestForBook(
  page: Page,
  ownerUsername: string,
  bookTitle: string,
): Promise<void> {
  await page.goto(`/profile/${ownerUsername}`);
  await waitForReact(page);

  await expect(
    page.getByText(bookTitle, { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Request", exact: true }).click();
  await page
    .getByPlaceholder(/interested in this book/i)
    .fill(`Hi! I'm interested in "${bookTitle}". Would love to trade!`);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByPlaceholder(/interested in this book/i),
  ).not.toBeVisible();
}

test.describe("Trade Flow", () => {
  test.describe.configure({ mode: "serial" });

  // Users created in global-setup, just check backend health
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await checkBackendHealth(page);
    await page.close();
  });

  test("Owner creates exchange post", async ({ page }) => {
    await useStoredAuth(page, "tradeSharer");
    await createExchangePost(
      page,
      tradeTestOwnerBook.title,
      tradeTestOwnerBook.author,
    );
  });

  test("Requester creates exchange post", async ({ page }) => {
    await useStoredAuth(page, "tradeRequester");
    await createExchangePost(
      page,
      tradeTestRequesterBook.title,
      tradeTestRequesterBook.author,
    );
  });

  test("Requester requests owner's book", async ({ page }) => {
    await useStoredAuth(page, "tradeRequester");
    await sendRequestForBook(
      page,
      tradeTestSharer.username,
      tradeTestOwnerBook.title,
    );
  });

  test("Owner sees interest and navigates to requester profile", async ({
    page,
  }) => {
    await useStoredAuth(page, "tradeSharer");
    await page.goto("/share");
    await waitForReact(page);

    await page.getByText("Someone is interested!").click();
    await page.getByRole("link", { name: "View Books" }).click();
    await waitForReact(page);

    await expect(
      page.getByText(tradeTestRequester.username, { exact: false }).first(),
    ).toBeVisible();
  });

  test("Owner proposes exchange", async ({ page }) => {
    await useStoredAuth(page, "tradeSharer");
    await page.goto(`/profile/${tradeTestRequester.username}`);
    await waitForReact(page);

    await page.getByRole("button", { name: "Exchange" }).click();
    await page.getByRole("button", { name: "Propose Exchange" }).click();
  });

  test("Requester accepts trade proposal", async ({ page }) => {
    await useStoredAuth(page, "tradeRequester");
    await page.goto("/activity");
    await waitForReact(page);

    await page
      .getByRole("button", { name: new RegExp(tradeTestOwnerBook.title) })
      .click();
    await page.getByRole("button", { name: "Accept" }).click();
    // Verify accept completed - should now see Trade Completed button
    await expect(
      page.getByRole("button", { name: "Trade Completed" }),
    ).toBeVisible();
  });

  test("Both users see confirm buttons", async ({ page }) => {
    await useStoredAuth(page, "tradeRequester");
    await page.goto("/activity");
    await waitForReact(page);

    await page
      .getByRole("button", { name: new RegExp(tradeTestOwnerBook.title) })
      .click();
    await expect(
      page.getByRole("button", { name: "Trade Completed" }),
    ).toBeVisible();

    await useStoredAuth(page, "tradeSharer");
    await page.goto("/share");
    await waitForReact(page);

    await expect(
      page.getByRole("button", { name: "Gift Completed" }),
    ).toBeVisible();
  });

  test("Book no longer appears in browse feed", async ({ page }) => {
    await page.goto("/browse");
    await waitForReact(page);

    await page.getByPlaceholder(/title|search/i).fill(tradeTestOwnerBook.title);
    await expect(
      page.getByText(tradeTestOwnerBook.title, { exact: false }).first(),
    ).not.toBeVisible();
  });

  test("Owner confirms completion", async ({ page }) => {
    await useStoredAuth(page, "tradeSharer");
    await page.goto("/share");
    await waitForReact(page);

    await page.getByRole("button", { name: "Gift Completed" }).click();
    await page.getByRole("button", { name: /yes, i gave it|yes/i }).click();
  });

  test("Requester confirms receipt", async ({ page }) => {
    await useStoredAuth(page, "tradeRequester");
    await page.goto("/activity");
    await waitForReact(page);

    await page
      .getByRole("button", { name: new RegExp(tradeTestOwnerBook.title) })
      .click();
    await page.getByRole("button", { name: "Trade Completed" }).click();
    await page
      .getByRole("button", { name: /yes, trade completed|yes/i })
      .click();
  });

  test("Book moved to owner archive", async ({ page }) => {
    await useStoredAuth(page, "tradeSharer");
    await page.goto("/share");
    await waitForReact(page);

    await page.getByRole("button", { name: "Active" }).click();
    await expect(
      page.getByText(tradeTestOwnerBook.title, { exact: false }).first(),
    ).not.toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(
      page.getByText(tradeTestOwnerBook.title, { exact: false }).first(),
    ).toBeVisible();
  });
});
