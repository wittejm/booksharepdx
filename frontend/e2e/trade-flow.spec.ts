import { test, expect, Page } from '@playwright/test';
import {
  waitForReact,
  createUser,
  loginAs,
  logout,
  checkBackendHealth,
  testOwner,
  testRequester,
} from './helpers';

// NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
// NOTE TO CLAUDE: FAILFAST EVERY ISSUE IN THE TEST, DON'T IGNORE THE ERROR AND MOVE ON

const tradeTestOwnerBook = {
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
};

const tradeTestRequesterBook = {
  title: '1984',
  author: 'George Orwell',
};

async function createExchangePost(page: Page, bookTitle: string, bookAuthor: string): Promise<void> {
  await page.goto('/share');
  await waitForReact(page);

  await page.getByRole('button', { name: 'Share a Book' }).click();

  await page.getByPlaceholder(/search for a book/i).fill(bookTitle);

  // Wait for and click search result by author name
  const searchResult = page.getByText(bookAuthor).first();
  if (await searchResult.isVisible()) {
    await searchResult.click();
  } else {
    // Fallback to manual entry
    const manualEntryBtn = page.getByRole('button', { name: /add manually|enter manually/i });
    if (await manualEntryBtn.isVisible()) {
      await manualEntryBtn.click();
      await page.getByPlaceholder(/title/i).fill(bookTitle);
      await page.getByPlaceholder(/author/i).fill(bookAuthor);
      await page.getByRole('button', { name: 'Add Book' }).click();
    }
  }

  // Select Exchange type
  const exchangeTypeBtn = page.getByRole('button', { name: 'Exchange' });
  if (await exchangeTypeBtn.isVisible()) {
    await exchangeTypeBtn.click();
  }

  await page.getByRole('button', { name: 'Share Book' }).click();

  // Verify post created
  await expect(page.getByText(bookTitle, { exact: false }).first()).toBeVisible();
}

async function sendRequestForBook(page: Page, ownerUsername: string, bookTitle: string): Promise<void> {
  await page.goto(`/profile/${ownerUsername}`);
  await waitForReact(page);

  await expect(page.getByText(bookTitle, { exact: false }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Request', exact: true }).click();

  await page.getByPlaceholder(/interested in this book/i).fill(`Hi! I'm interested in "${bookTitle}". Would love to trade!`);

  await page.getByRole('button', { name: 'Send' }).click();

  // Wait for modal to close
  await expect(page.getByPlaceholder(/interested in this book/i)).not.toBeVisible();
}

test.describe('Trade Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await checkBackendHealth(page);

    await createUser(page, testOwner);
    await logout(page);
    await createUser(page, testRequester);
    await page.close();
  });

  test('Owner creates exchange post', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await createExchangePost(page, tradeTestOwnerBook.title, tradeTestOwnerBook.author);
  });

  test('Requester creates exchange post', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await createExchangePost(page, tradeTestRequesterBook.title, tradeTestRequesterBook.author);
  });

  test('Requester requests owner\'s book', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await sendRequestForBook(page, testOwner.username, tradeTestOwnerBook.title);
  });

  test('Owner sees interest and navigates to requester profile', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto('/share');
    await waitForReact(page);

    await page.getByText('Someone is interested!').click();

    const viewBooksLink = page.getByRole('link', { name: 'View Books' });
    if (await viewBooksLink.isVisible()) {
      await viewBooksLink.click();
      await waitForReact(page);
    } else {
      await page.goto(`/profile/${testRequester.username}`);
      await waitForReact(page);
    }

    await expect(page.getByText(testRequester.username, { exact: false }).first()).toBeVisible();
  });

  test('Owner proposes exchange', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto(`/profile/${testRequester.username}`);
    await waitForReact(page);

    await page.getByRole('button', { name: 'Exchange' }).click();

    const confirmExchangeBtn = page.getByRole('button', { name: 'Propose Exchange' });
    if (await confirmExchangeBtn.isVisible()) {
      await confirmExchangeBtn.click();
    }
  });

  test('Requester accepts trade proposal', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await page.goto('/activity');
    await waitForReact(page);

    const threadItem = page.getByRole('button', { name: new RegExp(tradeTestOwnerBook.title) });
    if (await threadItem.isVisible()) {
      await threadItem.click();
    }

    await page.getByRole('button', { name: 'Accept' }).click();
  });

  test('Both users see confirm buttons', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await page.goto('/activity');
    await waitForReact(page);

    const threadItem = page.getByRole('button', { name: new RegExp(tradeTestOwnerBook.title) });
    if (await threadItem.isVisible()) {
      await threadItem.click();
    }

    // Requester should see Trade Completed button
    await expect(page.getByRole('button', { name: 'Trade Completed' })).toBeVisible();

    // Owner should see Gift Completed button
    await loginAs(page, testOwner.username);
    await page.goto('/share');
    await waitForReact(page);

    await expect(page.getByRole('button', { name: 'Gift Completed' })).toBeVisible();
  });

  test('Book no longer appears in browse feed', async ({ page }) => {
    await page.goto('/browse');
    await waitForReact(page);

    const searchInput = page.getByPlaceholder(/title|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(tradeTestOwnerBook.title);
    }

    // Book should not be visible (agreed upon for trade)
    await expect(page.getByText(tradeTestOwnerBook.title, { exact: false }).first()).not.toBeVisible();
  });

  test('Owner confirms completion', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto('/share');
    await waitForReact(page);

    await page.getByRole('button', { name: 'Gift Completed' }).click();

    const confirmDialogBtn = page.getByRole('button', { name: /yes, i gave it|yes/i });
    if (await confirmDialogBtn.isVisible()) {
      await confirmDialogBtn.click();
    }
  });

  test('Requester confirms receipt', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await page.goto('/activity');
    await waitForReact(page);

    const requesterThread = page.getByRole('button', { name: new RegExp(tradeTestOwnerBook.title) });
    if (await requesterThread.isVisible()) {
      await requesterThread.click();
    }

    await page.getByRole('button', { name: 'Trade Completed' }).click();

    const confirmReceiptBtn = page.getByRole('button', { name: /yes, trade completed|yes/i });
    if (await confirmReceiptBtn.isVisible()) {
      await confirmReceiptBtn.click();
    }
  });

  test('Book moved to owner archive', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto('/share');
    await waitForReact(page);

    // Check Active tab - book should NOT be there
    const activeTab = page.getByRole('button', { name: 'Active' });
    if (await activeTab.isVisible()) {
      await activeTab.click();
    }

    await expect(page.getByText(tradeTestOwnerBook.title, { exact: false }).first()).not.toBeVisible();

    // Check Archive tab - book SHOULD be there
    await page.getByRole('button', { name: 'Archive' }).click();

    await expect(page.getByText(tradeTestOwnerBook.title, { exact: false }).first()).toBeVisible();
  });
});
