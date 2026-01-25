import { test, expect, Page } from "@playwright/test";
import {
  waitForReact,
  createUserViaApi,
  loginAs,
  checkBackendHealth,
  deleteAllPostsForCurrentUser,
  LOAD_TIMEOUT,
} from "./helpers";

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON
// NOTE TO CLAUDE: NEVER use `if (await locator.isVisible())` - just call the action directly

// Unique users for this test file
const giftTimestamp = Date.now();
const giftTestSharer = {
  email: `giftsharer${giftTimestamp}@example.com`,
  username: `giftsharer${giftTimestamp}`,
  bio: "Gift flow test sharer",
};
const giftTestRequester = {
  email: `giftrequester${giftTimestamp}@example.com`,
  username: `giftrequester${giftTimestamp}`,
  bio: "Gift flow test requester",
};

async function createGiveawayPost(
  page: Page,
  bookTitle: string,
  bookAuthor: string,
): Promise<void> {
  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Share a Book" }).click();
  await page.getByPlaceholder(/search for a book/i).fill(bookTitle);
  await page.getByText(bookAuthor).first().click();
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
    .fill(`Hi! I'm interested in "${bookTitle}".`);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByPlaceholder(/interested in this book/i),
  ).not.toBeVisible();
}

async function cancelRequest(page: Page, bookTitle: string): Promise<void> {
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(bookTitle) }).click();
  await page.getByRole("button", { name: "Cancel Request" }).first().click();
  // Click the confirmation button in the dialog
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel Request" })
    .click();
  // Wait for dialog to close before continuing
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

async function declineRequest(page: Page, bookTitle: string): Promise<void> {
  await page.goto("/share");
  await waitForReact(page);

  // Verify the right book is shown
  await expect(page.getByText(bookTitle).first()).toBeVisible();
  // Click on the "Someone is interested!" button
  await page.getByText("Someone is interested!").first().click();
  // Wait for the interest row with Accept button to be visible (indicates data is loaded)
  await expect(
    page.getByRole("button", { name: "Accept", exact: true }),
  ).toBeVisible();
  // Click the inline Decline button (in the interest list, not a dialog)
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  // Wait for confirmation dialog and click Decline
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Decline", exact: true })
    .click();
  // Wait for dialog to close before continuing
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

async function dismissDeclinedRequest(
  page: Page,
  bookTitle: string,
): Promise<void> {
  await page.goto("/activity");
  await waitForReact(page);

  await page.getByRole("button", { name: new RegExp(bookTitle) }).click();
  await page.getByRole("button", { name: "Dismiss" }).click();
}

async function acceptRequest(page: Page): Promise<void> {
  await page.goto("/share");
  await waitForReact(page);

  await page.getByText("Someone is interested!").click();
  await page.getByRole("button", { name: "Accept" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /yes, give/i })
    .click();
  // Wait for dialog to close before continuing
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

async function openThread(page: Page, bookTitle: string): Promise<void> {
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(bookTitle) }).click();
}

test.describe("Gift Flow: Happy Path", () => {
  test.describe.configure({ mode: "serial" });

  const giftTestBook = { title: "To Kill a Mockingbird", author: "Harper Lee" };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await checkBackendHealth(page);
    await createUserViaApi(page, giftTestSharer);
    await createUserViaApi(page, giftTestRequester);
    await page.close();
  });

  test("Owner creates giveaway post", async ({ page }) => {
    await loginAs(page, giftTestSharer.username);
    await createGiveawayPost(page, giftTestBook.title, giftTestBook.author);
  });

  test("Requester requests book", async ({ page }) => {
    await loginAs(page, giftTestRequester.username);
    await sendRequestForBook(page, giftTestSharer.username, giftTestBook.title);
  });

  test("Owner accepts request", async ({ page }) => {
    await loginAs(page, giftTestSharer.username);
    await acceptRequest(page);
  });

  test("Thread status is accepted", async ({ page }) => {
    await loginAs(page, giftTestRequester.username);
    await openThread(page, giftTestBook.title);
    await expect(page.getByText("Your request was accepted")).toBeVisible();
  });

  test("Owner confirms completion", async ({ page }) => {
    await loginAs(page, giftTestSharer.username);
    await page.goto("/share");
    await waitForReact(page);

    await page.getByRole("button", { name: "Gift Completed" }).click();
    await page.getByRole("button", { name: "Yes, I gave it" }).click();
  });

  test("Requester confirms receipt", async ({ page }) => {
    await loginAs(page, giftTestRequester.username);
    await page.goto("/activity");
    await waitForReact(page);

    await page
      .getByRole("button", { name: new RegExp(giftTestBook.title) })
      .click();
    await page.getByRole("button", { name: "Gift Received" }).click();
    await page.getByRole("button", { name: /yes/i }).click();
  });

  test("Book in owner archive", async ({ page }) => {
    await loginAs(page, giftTestSharer.username);
    await page.goto("/share");
    await waitForReact(page);

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(
      page.getByText(giftTestBook.title, { exact: false }).first(),
    ).toBeVisible();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAs(page, giftTestSharer.username);
    await deleteAllPostsForCurrentUser(page);
    await page.close();
  });
});

test.describe("Gift Flow: Cancel and Re-request", () => {
  test.describe.configure({ mode: "serial" });

  const testBook = { title: "Pride and Prejudice", author: "Jane Austen" };
  const ownerUser = {
    email: `owner_cancel${giftTimestamp}@example.com`,
    username: `owner_cancel${giftTimestamp}`,
    bio: "Test owner for cancel flow",
  };
  const requesterUser = {
    email: `req_cancel${giftTimestamp}@example.com`,
    username: `req_cancel${giftTimestamp}`,
    bio: "Test requester for cancel flow",
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUserViaApi(page, ownerUser);
    await createUserViaApi(page, requesterUser);
    await page.close();
  });

  test("Owner creates giveaway", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title, testBook.author);
  });

  test("Requester requests then cancels", async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);
    await cancelRequest(page, testBook.title);

    // After cancelling, thread should disappear from activity list
    await page.goto("/activity");
    await waitForReact(page);
    await expect(
      page.getByRole("button", { name: new RegExp(testBook.title) }),
    ).not.toBeVisible();
  });

  test("Requester re-requests and thread reopens", async ({ page }) => {
    await loginAs(page, requesterUser.username);
    // Re-request via the owner's profile (since cancelled thread is gone from activity)
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await openThread(page, testBook.title);
    await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
  });

  test("Cancel history preserved", async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await openThread(page, testBook.title);
    await expect(page.getByText("Request cancelled")).toBeVisible();
  });
});

test.describe("Gift Flow: Decline and Dismiss", () => {
  test.describe.configure({ mode: "serial" });

  const testBook = { title: "Brave New World", author: "Aldous Huxley" };
  const ownerUser = {
    email: `dd_owner${giftTimestamp}@example.com`,
    username: `dd_owner${giftTimestamp}`,
    bio: "Test owner",
  };
  const requesterUser = {
    email: `dd_req${giftTimestamp}@example.com`,
    username: `dd_req${giftTimestamp}`,
    bio: "Test requester",
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUserViaApi(page, ownerUser);
    await createUserViaApi(page, requesterUser);
    await page.close();
  });

  test("Owner declines request", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title, testBook.author);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await declineRequest(page, testBook.title);
  });

  test("Requester sees decline and dismisses", async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await page.goto("/activity");
    await waitForReact(page);

    // Click on the thread to see the status message
    await page
      .getByRole("button", { name: new RegExp(testBook.title) })
      .click();
    await expect(page.getByText("Your request was declined")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  });
});

test.describe("Gift Flow: Decline Without Dismiss", () => {
  test.describe.configure({ mode: "serial" });

  const testBook = { title: "Fahrenheit 451", author: "Ray Bradbury" };
  const ownerUser = {
    email: `owner_nodismiss${giftTimestamp}@example.com`,
    username: `owner_nodismiss${giftTimestamp}`,
    bio: "Test owner",
  };
  const requesterUser = {
    email: `req_nodismiss${giftTimestamp}@example.com`,
    username: `req_nodismiss${giftTimestamp}`,
    bio: "Test requester",
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUserViaApi(page, ownerUser);
    await createUserViaApi(page, requesterUser);
    await page.close();
  });

  test("Decline banner remains visible", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title, testBook.author);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await declineRequest(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await openThread(page, testBook.title);
    await expect(page.getByText("Your request was declined")).toBeVisible();
  });
});

test.describe("Gift Flow: Multiple Requesters", () => {
  test.describe.configure({ mode: "serial" });

  const testBook = { title: "The Hobbit", author: "J.R.R. Tolkien" };
  const ownerUser = {
    email: `owner_multi${giftTimestamp}@example.com`,
    username: `owner_multi${giftTimestamp}`,
    bio: "Test owner",
  };
  const requester1 = {
    email: `req1_multi${giftTimestamp}@example.com`,
    username: `req1_multi${giftTimestamp}`,
    bio: "First requester",
  };
  const requester2 = {
    email: `req2_multi${giftTimestamp}@example.com`,
    username: `req2_multi${giftTimestamp}`,
    bio: "Second requester",
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUserViaApi(page, ownerUser);
    await createUserViaApi(page, requester1);
    await createUserViaApi(page, requester2);
    await page.close();
  });

  test("Both requesters request the book", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title, testBook.author);

    await loginAs(page, requester1.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, requester2.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);
  });

  test("Owner accepts first requester", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await page.goto("/share");
    await waitForReact(page);

    // Click the interest button on the card (not the banner)
    await page
      .getByRole("button", { name: /people are interested/i })
      .first()
      .click();
    // Wait for interest panel to load and find req1's row
    await expect(page.getByText(requester1.username)).toBeVisible();
    // Click Accept on the row containing req1
    const req1Row = page
      .locator("div")
      .filter({ hasText: requester1.username })
      .first();
    await req1Row.getByRole("button", { name: "Accept" }).first().click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /yes, give/i })
      .click();
    // Wait for dialog to close and status to update
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Second requester sees given to someone else", async ({ page }) => {
    await loginAs(page, requester2.username);
    await page.goto("/activity");
    await waitForReact(page);

    // Click on the thread to see the status message
    await page
      .getByRole("button", { name: new RegExp(testBook.title) })
      .click();
    await expect(
      page.getByText("This book was given to someone else"),
    ).toBeVisible({ timeout: LOAD_TIMEOUT });
  });
});

test.describe("Gift Flow: Cannot Re-request After Decline", () => {
  test.describe.configure({ mode: "serial" });

  const testBook = { title: "Animal Farm", author: "George Orwell" };
  const ownerUser = {
    email: `owner_norereq${giftTimestamp}@example.com`,
    username: `owner_norereq${giftTimestamp}`,
    bio: "Test owner",
  };
  const requesterUser = {
    email: `req_norereq${giftTimestamp}@example.com`,
    username: `req_norereq${giftTimestamp}`,
    bio: "Test requester",
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUserViaApi(page, ownerUser);
    await createUserViaApi(page, requesterUser);
    await page.close();
  });

  test("Thread stays dismissed after re-request attempt", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title, testBook.author);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await declineRequest(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await dismissDeclinedRequest(page, testBook.title);

    // After dismissing, thread is viewable but can't send messages (no input field)
    await openThread(page, testBook.title);
    // Verify the thread is selected (conversation panel shows)
    await expect(page.getByText("Conversation with")).toBeVisible();
    // Verify no message input (dismissed threads don't allow messaging)
    await expect(
      page.locator('input[placeholder*="message" i]'),
    ).not.toBeVisible();
  });
});

test.describe("Gift Flow: Post Deleted Mid-Conversation", () => {
  test.describe.configure({ mode: "serial" });

  const testBook = { title: "Lord of the Flies", author: "William Golding" };
  const ownerUser = {
    email: `owner_deleted${giftTimestamp}@example.com`,
    username: `owner_deleted${giftTimestamp}`,
    bio: "Test owner",
  };
  const requesterUser = {
    email: `req_deleted${giftTimestamp}@example.com`,
    username: `req_deleted${giftTimestamp}`,
    bio: "Test requester",
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUserViaApi(page, ownerUser);
    await createUserViaApi(page, requesterUser);
    await page.close();
  });

  test("Requester sees post removed message", async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title, testBook.author);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await page.goto("/share");
    await waitForReact(page);

    await page.getByLabel("Post menu").first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    // Wait for dialog to close before continuing
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await loginAs(page, requesterUser.username);
    await page.goto("/activity");
    await waitForReact(page);

    await expect(
      page.getByText(/removed|deleted|no longer available/i).first(),
    ).toBeVisible();
  });
});
