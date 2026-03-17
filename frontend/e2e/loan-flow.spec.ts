import { test, expect } from "@playwright/test";
import {
  waitForReact,
  createUserViaApi,
  loginAs,
  checkBackendHealth,
  createPostViaApi,
  createThreadViaApi,
  getCurrentUserViaApi,
  acceptLoanViaApi,
  completeThreadViaApi,
  confirmReturnViaApi,
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
    borrower: {
      email: `${prefix}_borr${ts}@example.com`,
      username: `${prefix}_borr${ts}`,
      bio: "Test borrower",
    },
  };
}

// Common test books for loans
const loanBooks = {
  dune: { title: "Dune", author: "Frank Herbert" },
  enders: { title: "Ender's Game", author: "Orson Scott Card" },
  neuromancer: { title: "Neuromancer", author: "William Gibson" },
  foundation: { title: "Foundation", author: "Isaac Asimov" },
  hyperion: { title: "Hyperion", author: "Dan Simmons" },
};

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await checkBackendHealth(page);
  await page.close();
});

// ============================================================================
// LOAN FLOW TESTS - Each test is independent
// ============================================================================

test("Owner creates loan post with duration", async ({ page }) => {
  const users = createTestUsers("create_loan");
  await createUserViaApi(page, users.owner);
  await loginAs(page, users.owner.username);

  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Share a Book" }).click();
  await page.getByPlaceholder(/search for a book/i).fill(loanBooks.dune.title);
  await page.getByText(loanBooks.dune.author).first().click();
  // Select Loan type (use exact match to avoid matching nav items)
  await page.getByRole("button", { name: "Loan Lend temporarily" }).click();
  // Loan duration selector should appear
  await expect(page.getByText("Loan Duration")).toBeVisible();
  // Select 60 days
  await page.getByRole("combobox").selectOption("60");
  await page.getByRole("button", { name: "Share Book" }).click();

  await expect(page.getByPlaceholder(/search for a book/i)).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: loanBooks.dune.title }),
  ).toBeVisible();
});

test("Borrower can request a loan book", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("req_loan");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  await createPostViaApi(page, { ...loanBooks.dune, type: "loan", loanDuration: 30 });

  // UI TEST
  await loginAs(page, users.borrower.username);
  await page.goto(`/profile/${users.owner.username}`);
  await waitForReact(page);

  await expect(
    page.getByRole("heading", { name: loanBooks.dune.title }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Request", exact: true }).click();
  await page
    .getByPlaceholder(/interested in this book/i)
    .fill("I'd love to borrow this!");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByRole("link", { name: /you requested this/i }),
  ).toBeVisible();
});

test("Owner accepts loan with duration picker", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("loan_off");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.dune, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  await createThreadViaApi(page, post.id, ownerData.id, "I'd love to borrow this!");

  // UI TEST
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await page.getByText("Someone is interested!").click();
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  // Loan offer modal should appear (not the gift confirm dialog)
  await expect(page.getByRole("heading", { name: "Offer Loan" })).toBeVisible();
  await expect(page.getByText("Loan Duration")).toBeVisible();
  // Click "Offer Loan" button
  await page.getByRole("button", { name: "Offer Loan" }).click();

  // Modal should close and we should see the pending completion state
  await expect(page.getByText("Offer Loan")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Gift Completed" })).toBeVisible();
});

test("Borrower sees accepted loan in Activity", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("borr_sees");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.enders, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd love to borrow this!");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 30);

  // UI TEST
  await loginAs(page, users.borrower.username);
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(loanBooks.enders.title) }).click();

  await expect(page.getByText("Your request was accepted")).toBeVisible();
});

test("Owner confirms loan handoff, status becomes on_loan", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("handoff");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.dune, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "I'd love to borrow this!");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 30);

  // UI TEST - Owner confirms handoff via "Gift Completed" button
  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Gift Completed" }).click();
  await page.getByRole("button", { name: "Yes, I gave it" }).click();

  // After owner confirms, the on-loan section should appear
  await expect(page.getByText(new RegExp(`On loan to ${users.borrower.username}`))).toBeVisible();
  await expect(page.getByText(/Due /)).toBeVisible();
});

test("Borrower sees on_loan status in Activity", async ({ page }) => {
  // SETUP via API - owner accepts and confirms handoff
  const users = createTestUsers("on_loan_act");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.neuromancer, type: "loan", loanDuration: 60 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "Can I borrow this?");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 60);
  await completeThreadViaApi(page, thread.id); // Owner confirms handoff → on_loan

  // UI TEST
  await loginAs(page, users.borrower.username);
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(loanBooks.neuromancer.title) }).click();

  await expect(page.getByText("You currently have this book on loan")).toBeVisible();
  await expect(page.getByText(/Due /)).toBeVisible();
  await expect(page.getByRole("button", { name: "I Returned It" })).toBeVisible();
});

test("Borrower confirms return", async ({ page }) => {
  // SETUP via API - full handoff complete, book is on_loan
  const users = createTestUsers("borr_ret");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.foundation, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "Can I borrow this?");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 30);
  await completeThreadViaApi(page, thread.id); // Owner confirms handoff → on_loan

  // UI TEST - Borrower confirms return
  await loginAs(page, users.borrower.username);
  await page.goto("/activity");
  await waitForReact(page);
  await page.getByRole("button", { name: new RegExp(loanBooks.foundation.title) }).click();

  await page.getByRole("button", { name: "I Returned It" }).click();
  // Confirmation dialog
  await page.getByRole("button", { name: /yes, i returned it/i }).click();

  // After confirming, the return completed badge should show
  await expect(page.getByText("✓ Return completed")).toBeVisible();
});

test("Owner confirms return and relists book", async ({ page }) => {
  // SETUP via API - borrower already confirmed return
  const users = createTestUsers("relist");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.dune, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "Can I borrow this?");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 30);
  await completeThreadViaApi(page, thread.id); // Owner confirms handoff → on_loan
  await loginAs(page, users.borrower.username);
  await confirmReturnViaApi(page, thread.id); // Borrower confirms return

  // UI TEST - Owner sees on-loan section with return buttons
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  // Owner should see "Received & Relist" button
  await expect(page.getByRole("button", { name: "Received & Relist" })).toBeVisible();
  await page.getByRole("button", { name: "Received & Relist" }).click();
  // Confirmation dialog
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /relist/i })
    .click();

  // Book should now be back in active shares (relisted)
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: loanBooks.dune.title }),
  ).toBeVisible();
});

test("Owner confirms return and archives book", async ({ page }) => {
  // SETUP via API - borrower already confirmed return
  const users = createTestUsers("arch_loan");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.hyperion, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "Can I borrow this?");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 30);
  await completeThreadViaApi(page, thread.id); // Owner confirms handoff → on_loan
  await loginAs(page, users.borrower.username);
  await confirmReturnViaApi(page, thread.id); // Borrower confirms return

  // UI TEST - Owner archives instead of relisting
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await page.getByRole("button", { name: "Received & Archive" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /archive/i })
    .click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
  // Book should be in Archive tab now
  await page.getByRole("button", { name: /^Archive/ }).click();
  await expect(
    page.getByText(loanBooks.hyperion.title, { exact: false }).first(),
  ).toBeVisible();
});

test("Full loan cycle: create → request → accept → handoff → return → relist", async ({
  page,
}) => {
  // SETUP via API - create users and loan post
  const users = createTestUsers("full_loan");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.enders, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  const { thread } = await createThreadViaApi(page, post.id, ownerData.id, "Can I borrow this?");
  await loginAs(page, users.owner.username);
  await acceptLoanViaApi(page, thread.id, 30);
  await completeThreadViaApi(page, thread.id); // Owner handoff → on_loan
  await loginAs(page, users.borrower.username);
  await confirmReturnViaApi(page, thread.id); // Borrower returns
  await loginAs(page, users.owner.username);
  await confirmReturnViaApi(page, thread.id, true); // Owner confirms return + relist

  // UI TEST - Book should be back in active shares after full cycle
  await page.goto("/share");
  await waitForReact(page);

  await expect(
    page.getByRole("heading", { name: loanBooks.enders.title }),
  ).toBeVisible();
});

test("Loan post shows purple Loan badge in browse", async ({ page }) => {
  // SETUP via API
  const users = createTestUsers("badge_loan");
  await createUserViaApi(page, users.owner);
  await loginAs(page, users.owner.username);
  await createPostViaApi(page, { ...loanBooks.dune, type: "loan", loanDuration: 30 });

  // UI TEST
  await page.goto("/browse");
  await waitForReact(page);

  await expect(page.getByText("Loan").first()).toBeVisible();
});

test("Cannot propose exchange on a loan post", async ({ page }) => {
  // SETUP via API - owner has loan post, borrower has exchange post
  const users = createTestUsers("no_ex_ln");
  await createUserViaApi(page, users.owner);
  await createUserViaApi(page, users.borrower);
  await loginAs(page, users.owner.username);
  const post = await createPostViaApi(page, { ...loanBooks.dune, type: "loan", loanDuration: 30 });
  const ownerData = await getCurrentUserViaApi(page);
  await loginAs(page, users.borrower.username);
  await createPostViaApi(page, { ...loanBooks.enders, type: "exchange" });
  await createThreadViaApi(page, post.id, ownerData.id, "Can I borrow this?");

  // UI TEST - Owner should NOT see "View Books" link for loan posts
  await loginAs(page, users.owner.username);
  await page.goto("/share");
  await waitForReact(page);

  await page.getByText("Someone is interested!").click();
  // The exchange "View Books" link should not be present for loan posts
  await expect(page.getByRole("link", { name: "View Books" })).not.toBeVisible();
});
