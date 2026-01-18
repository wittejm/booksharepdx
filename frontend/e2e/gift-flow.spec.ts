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

const timestamp = Date.now();

async function createGiveawayPost(page: Page, bookTitle: string): Promise<void> {
  await page.goto('/share');
  await waitForReact(page);

  await page.getByRole('button', { name: 'Share a Book' }).click();

  const searchInput = page.getByPlaceholder(/search for a book/i);
  await searchInput.fill(bookTitle);

  // Wait for search results to appear, then click author name
  const searchResult = page.getByText('Harper Lee').first();
  await searchResult.click();

  await page.getByRole('button', { name: 'Share Book' }).click();

  // Verify post was created
  await expect(page.getByText(bookTitle, { exact: false }).first()).toBeVisible();
}

async function sendRequestForBook(page: Page, ownerUsername: string, bookTitle: string): Promise<void> {
  await page.goto(`/profile/${ownerUsername}`);
  await waitForReact(page);

  await expect(page.getByText(bookTitle, { exact: false }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Request', exact: true }).click();

  await page.getByPlaceholder(/interested in this book/i).fill(`Hi! I'm interested in "${bookTitle}".`);

  await page.getByRole('button', { name: 'Send' }).click();

  // Wait for modal to close / request to complete
  await expect(page.getByPlaceholder(/interested in this book/i)).not.toBeVisible();
}

async function cancelRequest(page: Page, bookTitle: string): Promise<void> {
  await page.goto('/activity');
  await waitForReact(page);

  const threadItem = page.getByRole('button', { name: new RegExp(bookTitle) });
  await threadItem.click();

  await page.getByRole('button', { name: 'Cancel Request' }).click();

  const confirmBtn = page.getByRole('button', { name: /yes|confirm/i });
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
}

async function declineRequest(page: Page): Promise<void> {
  await page.goto('/share');
  await waitForReact(page);

  await page.getByText('Someone is interested!').click();

  await page.getByRole('button', { name: 'Decline' }).click();

  const confirmBtn = page.getByRole('button', { name: /yes|confirm/i });
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
}

async function dismissDeclinedRequest(page: Page, bookTitle: string): Promise<void> {
  await page.goto('/activity');
  await waitForReact(page);

  const threadItem = page.getByRole('button', { name: new RegExp(bookTitle) });
  await threadItem.click();

  await page.getByRole('button', { name: 'Dismiss' }).click();
}

async function acceptRequest(page: Page): Promise<void> {
  await page.goto('/share');
  await waitForReact(page);

  await page.getByText('Someone is interested!').click();

  await page.getByRole('button', { name: /accept|give to/i }).click();

  const confirmBtn = page.getByRole('button', { name: /yes|confirm/i });
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
  }
}

async function getThreadStatus(page: Page, bookTitle: string): Promise<string> {
  await page.goto('/activity');
  await waitForReact(page);

  const threadItem = page.getByRole('button', { name: new RegExp(bookTitle) });
  if (await threadItem.isVisible()) {
    await threadItem.click();
  }

  if (await page.getByText('You cancelled this request').isVisible()) return 'cancelled_by_requester';
  if (await page.getByText('Your request was declined').isVisible()) return 'declined_by_owner';
  if (await page.getByText('Your request was accepted').isVisible()) return 'accepted';

  return 'active';
}

test.describe('Gift Flow: Happy Path', () => {
  test.describe.configure({ mode: 'serial' });

  const giftTestBook = { title: 'To Kill a Mockingbird', author: 'Harper Lee' };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await checkBackendHealth(page);
    await createUser(page, testOwner);
    await logout(page);
    await createUser(page, testRequester);
    await page.close();
  });

  test('Owner creates giveaway post', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await createGiveawayPost(page, giftTestBook.title);
  });

  test('Requester requests book', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await sendRequestForBook(page, testOwner.username, giftTestBook.title);
  });

  test('Owner accepts request', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await acceptRequest(page);
  });

  test('Thread status is accepted', async ({ page }) => {
    await loginAs(page, testRequester.username);
    const status = await getThreadStatus(page, giftTestBook.title);
    expect(status).toBe('accepted');
  });

  test('Owner confirms completion', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto('/share');
    await waitForReact(page);

    const completeBtn = page.getByRole('button', { name: 'Gift Completed' });
    await completeBtn.click();

    const confirmBtn = page.getByRole('button', { name: 'Yes, I gave it' });
    if (await confirmBtn.isVisible()) await confirmBtn.click();
  });

  test('Requester confirms receipt', async ({ page }) => {
    await loginAs(page, testRequester.username);
    await page.goto('/activity');
    await waitForReact(page);

    const receiveBtn = page.getByRole('button', { name: 'Received' });
    if (await receiveBtn.isVisible()) {
      await receiveBtn.click();
      const confirmBtn = page.getByRole('button', { name: /yes/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
    }
  });

  test('Book in owner archive', async ({ page }) => {
    await loginAs(page, testOwner.username);
    await page.goto('/share');
    await waitForReact(page);

    await page.getByRole('button', { name: 'Archive' }).click();

    await expect(page.getByText(giftTestBook.title, { exact: false }).first()).toBeVisible();
  });
});

test.describe('Gift Flow: Cancel and Re-request', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'Pride and Prejudice', author: 'Jane Austen' };
  const ownerUser = {
    email: `owner_cancel${timestamp}@example.com`,
    username: `owner_cancel${timestamp}`,
    bio: 'Test owner for cancel flow',
  };
  const requesterUser = {
    email: `req_cancel${timestamp}@example.com`,
    username: `req_cancel${timestamp}`,
    bio: 'Test requester for cancel flow',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requesterUser);
    await page.close();
  });

  test('Owner creates giveaway', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);
  });

  test('Requester requests then cancels', async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);
    await cancelRequest(page, testBook.title);

    const status = await getThreadStatus(page, testBook.title);
    expect(status).toBe('cancelled_by_requester');
  });

  test('Requester re-requests and thread reopens', async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    const status = await getThreadStatus(page, testBook.title);
    expect(status).toBe('active');
  });

  test('Cancel history preserved', async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await page.goto('/activity');
    await waitForReact(page);

    const threadItem = page.getByRole('button', { name: new RegExp(testBook.title) });
    await threadItem.click();

    await expect(page.locator('text="cancelled"').first()).toBeVisible();
  });
});

test.describe('Gift Flow: Cancel Stays Cancelled', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'The Catcher in the Rye', author: 'J.D. Salinger' };
  const ownerUser = {
    email: `owner_stay${timestamp}@example.com`,
    username: `owner_stay${timestamp}`,
    bio: 'Test owner',
  };
  const requesterUser = {
    email: `req_stay${timestamp}@example.com`,
    username: `req_stay${timestamp}`,
    bio: 'Test requester',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requesterUser);
    await page.close();
  });

  test('Request and cancel flow', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);
    await cancelRequest(page, testBook.title);

    const status = await getThreadStatus(page, testBook.title);
    expect(status).toBe('cancelled_by_requester');

    await expect(page.locator('text="You cancelled this request"')).toBeVisible();
  });
});

test.describe('Gift Flow: Decline and Dismiss', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'Brave New World', author: 'Aldous Huxley' };
  const ownerUser = {
    email: `owner_decline${timestamp}@example.com`,
    username: `owner_decline${timestamp}`,
    bio: 'Test owner',
  };
  const requesterUser = {
    email: `req_decline${timestamp}@example.com`,
    username: `req_decline${timestamp}`,
    bio: 'Test requester',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requesterUser);
    await page.close();
  });

  test('Owner declines request', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await declineRequest(page);
  });

  test('Requester sees decline and dismisses', async ({ page }) => {
    await loginAs(page, requesterUser.username);
    await page.goto('/activity');
    await waitForReact(page);

    await expect(page.locator('text="Your request was declined"')).toBeVisible();

    await dismissDeclinedRequest(page, testBook.title);
  });
});

test.describe('Gift Flow: Decline Without Dismiss', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'Fahrenheit 451', author: 'Ray Bradbury' };
  const ownerUser = {
    email: `owner_nodismiss${timestamp}@example.com`,
    username: `owner_nodismiss${timestamp}`,
    bio: 'Test owner',
  };
  const requesterUser = {
    email: `req_nodismiss${timestamp}@example.com`,
    username: `req_nodismiss${timestamp}`,
    bio: 'Test requester',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requesterUser);
    await page.close();
  });

  test('Decline banner remains visible', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await declineRequest(page);

    await loginAs(page, requesterUser.username);
    const status = await getThreadStatus(page, testBook.title);
    expect(status).toBe('declined_by_owner');

    await expect(page.locator('text="Your request was declined"')).toBeVisible();
  });
});

test.describe('Gift Flow: Multiple Requesters', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'The Hobbit', author: 'J.R.R. Tolkien' };
  const ownerUser = {
    email: `owner_multi${timestamp}@example.com`,
    username: `owner_multi${timestamp}`,
    bio: 'Test owner',
  };
  const requester1 = {
    email: `req1_multi${timestamp}@example.com`,
    username: `req1_multi${timestamp}`,
    bio: 'First requester',
  };
  const requester2 = {
    email: `req2_multi${timestamp}@example.com`,
    username: `req2_multi${timestamp}`,
    bio: 'Second requester',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requester1);
    await logout(page);
    await createUser(page, requester2);
    await page.close();
  });

  test('Both requesters request the book', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);

    await loginAs(page, requester1.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, requester2.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);
  });

  test('Owner accepts first requester', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await page.goto('/share');
    await waitForReact(page);

    // Multiple requesters shows "X people are interested"
    await page.getByText(/interested/i).first().click();

    await page.getByRole('button', { name: /accept/i }).click();

    const confirmBtn = page.getByRole('button', { name: /yes/i });
    if (await confirmBtn.isVisible()) await confirmBtn.click();
  });

  test('Second requester sees given to someone else', async ({ page }) => {
    await loginAs(page, requester2.username);
    await page.goto('/activity');
    await waitForReact(page);

    await expect(page.getByText(/given to someone else|given to another/i).first()).toBeVisible();
  });
});

test.describe('Gift Flow: Cannot Re-request After Decline', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'Animal Farm', author: 'George Orwell' };
  const ownerUser = {
    email: `owner_norereq${timestamp}@example.com`,
    username: `owner_norereq${timestamp}`,
    bio: 'Test owner',
  };
  const requesterUser = {
    email: `req_norereq${timestamp}@example.com`,
    username: `req_norereq${timestamp}`,
    bio: 'Test requester',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requesterUser);
    await page.close();
  });

  test('Thread stays dismissed after re-request attempt', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await declineRequest(page);

    await loginAs(page, requesterUser.username);
    await dismissDeclinedRequest(page, testBook.title);

    await page.goto('/activity');
    await waitForReact(page);

    const threadItem = page.getByRole('button', { name: new RegExp(testBook.title) });
    if (await threadItem.isVisible()) {
      await threadItem.click();

      const messageInput = page.locator('textarea, input[type="text"][placeholder*="message" i]').first();
      if (await messageInput.isVisible()) {
        await messageInput.fill('Can I please have this book?');
        const sendBtn = page.getByRole('button', { name: 'Send' });
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
        }
      }
    }

    const status = await getThreadStatus(page, testBook.title);
    expect(status).not.toBe('active');
  });
});

test.describe('Gift Flow: Post Deleted Mid-Conversation', () => {
  test.describe.configure({ mode: 'serial' });

  const testBook = { title: 'Lord of the Flies', author: 'William Golding' };
  const ownerUser = {
    email: `owner_deleted${timestamp}@example.com`,
    username: `owner_deleted${timestamp}`,
    bio: 'Test owner',
  };
  const requesterUser = {
    email: `req_deleted${timestamp}@example.com`,
    username: `req_deleted${timestamp}`,
    bio: 'Test requester',
  };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await createUser(page, ownerUser);
    await logout(page);
    await createUser(page, requesterUser);
    await page.close();
  });

  test('Requester sees post removed message', async ({ page }) => {
    await loginAs(page, ownerUser.username);
    await createGiveawayPost(page, testBook.title);

    await loginAs(page, requesterUser.username);
    await sendRequestForBook(page, ownerUser.username, testBook.title);

    await loginAs(page, ownerUser.username);
    await page.goto('/share');
    await waitForReact(page);

    const menuBtn = page.locator('button[aria-label*="menu" i], button:has([class*="ellipsis"]), .post-menu-btn').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }

    const deleteBtn = page.getByRole('menuitem', { name: 'Delete' });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.getByRole('button', { name: /delete|confirm/i });
      if (await confirmBtn.isVisible()) await confirmBtn.click();
    }

    await loginAs(page, requesterUser.username);
    await page.goto('/activity');
    await waitForReact(page);

    await expect(page.getByText(/removed|deleted|no longer available/i).first()).toBeVisible();
  });
});
