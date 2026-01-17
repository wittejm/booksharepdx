/**
 * E2E Test Suite for BookSharePDX
 *
 * Tests are organized into:
 * - Core Tests: Basic functionality that should always pass
 * - Feature Tests: New features that will fail until implemented
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const LOG_PATH = path.join(__dirname, '..', 'TEST_LOG.md');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-screenshots');

// Track if we have a working backend
let backendHealthy = false;

// Filter for running specific tests (e.g., TEST_ONLY=trade)
const testFilter = process.env.TEST_ONLY?.toLowerCase();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  category: 'core' | 'feature';
}

const results: TestResult[] = [];
let browser: Browser;
let page: Page;

// Unique test users for this run
const timestamp = Date.now();
const testOwner = {
  email: `owner${timestamp}@example.com`,
  username: `owner${timestamp}`,
  bio: 'I love sharing books with my Portland neighbors.',
};
const testRequester = {
  email: `requester${timestamp}@example.com`,
  username: `requester${timestamp}`,
  bio: 'Always looking for good reads!',
};

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

// Track current test step for verbose error messages
let currentStep = '';
function step(description: string) {
  currentStep = description;
  log(`  → ${description}`);
}

function appendToLog(content: string) {
  fs.appendFileSync(LOG_PATH, content + '\n');
}

async function runTest(
  name: string,
  category: 'core' | 'feature',
  testFn: () => Promise<void>
) {
  const start = Date.now();
  currentStep = ''; // Reset step tracking
  log(`Running: ${name} [${category}]`);
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration, category });
    log(`  ✓ PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    const stepInfo = currentStep ? ` [at step: ${currentStep}]` : '';
    const fullError = `${errorMsg}${stepInfo}`;
    results.push({ name, passed: false, error: fullError, duration, category });
    log(`  ✗ FAILED: ${errorMsg}`);
    if (currentStep) {
      log(`    └─ Failed at step: "${currentStep}"`);
    }
  }
}

async function waitForNavigation(timeout = 5000) {
  // Wait for React to render - look for any meaningful content
  await page.waitForLoadState('domcontentloaded', { timeout });
  // Wait for React app to mount (look for common elements)
  await page.waitForSelector('h1, h2, form, [class*="container"], main, nav', { timeout }).catch(() => {});
}

async function screenshot(name: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

// Helper: Create a user via signup
async function createUser(user: typeof testOwner) {
  step(`Creating user: ${user.username}`);
  await page.goto(`${BASE_URL}/signup`);
  await waitForNavigation();
  await page.fill('input[id="email"]', user.email);
  await page.fill('input[id="username"]', user.username);
  await page.fill('textarea[id="bio"]', user.bio);
  await page.click('input[type="checkbox"]');
  await page.click('button[type="submit"]');
  // Wait for navigation away from signup page (success) or error message (failure)
  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 5000 }),
    page.waitForSelector('[class*="error"]:not(input), [role="alert"], .text-red-500', { timeout: 5000 }),
  ]);
}

// Helper: Login as user (dev mode - direct login)
async function loginAs(identifier: string) {
  step(`Logging in as: ${identifier}`);
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();

  // If redirected away from login (already logged in), we're done
  if (!page.url().includes('/login')) {
    return;
  }

  const identifierInput = await page.$('input[id="identifier"]');
  if (!identifierInput) {
    // No login form - might already be logged in
    return;
  }

  await page.fill('input[id="identifier"]', identifier);
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page or feedback message
  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 5000 }),
    page.waitForSelector(':has-text("Check your email"), :has-text("sign-in link"), [class*="error"], [role="alert"]', { timeout: 5000 }),
  ]);
}

// Helper: Logout
async function logout() {
  step('Logging out');
  const logoutBtn = await page.$('button:has-text("Logout"), button:has-text("Sign Out")');
  if (logoutBtn) {
    await logoutBtn.click();
    // Wait for logout button to disappear or login link to appear
    await Promise.race([
      page.waitForSelector('button:has-text("Logout"), button:has-text("Sign Out")', { state: 'hidden', timeout: 5000 }),
      page.waitForSelector('a[href="/login"]', { timeout: 5000 }),
    ]).catch(() => {}); // Ignore timeout if already logged out
  }
}

// ============================================================================
// CORE TESTS - Basic functionality that should always work
// ============================================================================

async function testBackendHealth() {
  // Check if backend is responding
  const response = await page.request.get(`${API_URL}/api/posts`);

  if (!response.ok()) {
    const status = response.status();
    let body = '';
    try {
      body = await response.text();
    } catch {}
    throw new Error(`Backend unhealthy: ${status} - ${body.slice(0, 200)}`);
  }

  backendHealthy = true;
  log('Backend is healthy');
}

async function testLandingPage() {
  await page.goto(BASE_URL);
  await waitForNavigation();

  const title = await page.title();
  if (!title.includes('BookShare')) {
    throw new Error(`Unexpected title: ${title}`);
  }

  // Should have signup/login links
  const signupLink = await page.$('a[href="/signup"]');
  const browseLink = await page.$('a[href="/browse"]');

  if (!signupLink) throw new Error('Signup link not found');
  if (!browseLink) throw new Error('Browse link not found');

  await screenshot('01-landing-page');
}

async function testSignupFlow() {
  await page.goto(`${BASE_URL}/signup`);
  await waitForNavigation();

  // Check form elements exist
  const emailInput = await page.$('input[id="email"]');
  const usernameInput = await page.$('input[id="username"]');
  const bioInput = await page.$('textarea[id="bio"]');
  const checkbox = await page.$('input[type="checkbox"]');
  const submitBtn = await page.$('button[type="submit"]');

  if (!emailInput) throw new Error('Email input missing');
  if (!usernameInput) throw new Error('Username input missing');
  if (!bioInput) throw new Error('Bio input missing');
  if (!checkbox) throw new Error('Guidelines checkbox missing');
  if (!submitBtn) throw new Error('Submit button missing');

  // Fill and submit
  await createUser(testOwner);

  // Should redirect away from signup on success
  const currentUrl = page.url();
  if (currentUrl.includes('/signup')) {
    // Try multiple selectors to find error messages
    const errorEl = await page.$('[class*="error"]:not(input), [role="alert"], .text-red-500');
    let errorText = await errorEl?.textContent();

    // Also check for toast messages
    if (!errorText) {
      const toast = await page.$('[class*="toast"], [class*="Toastify"]');
      errorText = await toast?.textContent();
    }

    // Take screenshot to help debug
    await screenshot('02-signup-failed');

    // Get any visible text that might indicate what went wrong
    if (!errorText) {
      const pageText = await page.textContent('body');
      const errorMatch = pageText?.match(/error|failed|invalid|unable/i);
      if (errorMatch) {
        errorText = `Page contains error text near: "${pageText?.slice(Math.max(0, (pageText?.indexOf(errorMatch[0]) || 0) - 50), (pageText?.indexOf(errorMatch[0]) || 0) + 100)}"`;
      }
    }

    throw new Error(`Signup failed: ${errorText || 'still on signup page with no visible error'}`);
  }

  await screenshot('02-signup-complete');
}

async function testLoginFlow() {
  await logout();
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();

  // Check form exists
  const identifierInput = await page.$('input[id="identifier"]');
  const submitBtn = await page.$('button[type="submit"]');

  if (!identifierInput) throw new Error('Identifier input missing');
  if (!submitBtn) throw new Error('Submit button missing');

  // Login with username
  await page.fill('input[id="identifier"]', testOwner.username);
  await screenshot('03-login-filled');
  await page.click('button[type="submit"]');
  // Wait for navigation away from login page or feedback message
  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 5000 }),
    page.waitForSelector(':has-text("Check your email"), :has-text("sign-in link"), [class*="error"], [role="alert"]', { timeout: 5000 }),
  ]);

  await screenshot('04-login-result');

  // Verify login succeeded - should see user menu or be redirected away from login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    // Still on login page - check for "check your email" or error
    const emailSent = await page.$(':has-text("Check your email"), :has-text("sign-in link")');
    const errorEl = await page.$('[class*="error"], [role="alert"]');

    if (errorEl) {
      const errorText = await errorEl.textContent();
      throw new Error(`Login failed: ${errorText}`);
    }

    if (!emailSent) {
      throw new Error('Login did not succeed - still on login page with no feedback');
    }
    // Email mode is OK
  }
  // If we navigated away, login succeeded
}

async function testBrowsePage() {
  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();

  // Should have filter/search UI
  const pageContent = await page.content();
  if (!pageContent.toLowerCase().includes('browse')) {
    throw new Error('Browse page does not have expected content');
  }

  await screenshot('05-browse-page');
}

async function testProfilePage() {
  await page.goto(`${BASE_URL}/profile/${testOwner.username}`);
  await waitForNavigation();

  const pageContent = await page.content();
  if (!pageContent.includes(testOwner.username)) {
    throw new Error('Profile page does not show username');
  }

  await screenshot('06-profile-page');
}

async function testSharePageLoad() {
  // Navigate to share page (user's own shares)
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Should load without error
  const errorEl = await page.$('[class*="error"]:not(input)');
  if (errorEl) {
    const errorText = await errorEl.textContent();
    if (errorText && !errorText.includes('No')) {
      throw new Error(`Share page error: ${errorText}`);
    }
  }

  await screenshot('07-share-page');
}

async function testCreateGiveawayPost() {
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for book search input to create a new share
  const bookSearchInput = await page.$('input[placeholder*="book" i], input[placeholder*="search" i]');

  if (!bookSearchInput) {
    // May need to click a button to show the form
    const addBtn = await page.$('button:has-text("Share"), button:has-text("Add")');
    if (addBtn) {
      await addBtn.click();
      // Wait for form to appear
      await page.waitForSelector('input[placeholder*="book" i], input[placeholder*="search" i], form', { timeout: 5000 }).catch(() => {});
    }
  }

  await screenshot('08-create-post-form');
}

async function testResponsiveDesign() {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  await waitForNavigation();
  await screenshot('09-mobile-landing');

  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();
  await screenshot('10-mobile-browse');

  // Reset to desktop
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function testNavigation() {
  await page.goto(BASE_URL);
  await waitForNavigation();

  // Check key navigation links exist
  const links = await page.$$('a[href]');
  const hrefs = await Promise.all(links.map(l => l.getAttribute('href')));

  const requiredPaths = ['/browse'];
  const missingPaths = requiredPaths.filter(p => !hrefs.some(h => h?.includes(p)));

  if (missingPaths.length > 0) {
    throw new Error(`Missing navigation links: ${missingPaths.join(', ')}`);
  }

  await screenshot('11-navigation');
}

async function test404Page() {
  await page.goto(`${BASE_URL}/nonexistent-page-12345`);
  await waitForNavigation();

  // Should show some kind of not found message or redirect
  await screenshot('12-404-page');
}

// ============================================================================
// FEATURE TESTS - New features (expected to fail until implemented)
// ============================================================================

async function testInterestBanner() {
  // Setup: Create requester and have them express interest
  await logout();
  await createUser(testRequester);

  // Requester messages owner about a book (creates interest)
  // For now, just check the banner component exists when logged in as owner
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();

  // Look for interest banner (should appear when someone is interested in your books)
  const interestBanner = await page.$('[data-testid="interest-banner"], [class*="interest-banner"]');

  // This will fail until interest tracking is implemented
  // For now, just check the Share nav has a badge capability
  const shareBadge = await page.$('[data-testid="share-badge"], .share-badge');

  await screenshot('13-interest-banner');

  // Feature test: banner should exist when there's interest
  // This test documents the expected behavior
  log('Interest banner test: checking for interest notification UI');
}

async function testGiftFlow_SelectRecipient() {
  // Owner should be able to select a recipient from interested users
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for "Yes I will give this to you" or similar selection UI
  const selectRecipientBtn = await page.$(
    'button:has-text("Give to"), button:has-text("Select"), [data-testid="select-recipient"]'
  );

  await screenshot('14-gift-select-recipient');

  if (!selectRecipientBtn) {
    throw new Error('Gift flow: Select recipient button not found (feature not implemented)');
  }
}

async function testGiftFlow_Completion() {
  // After selecting recipient, both parties should see completion buttons
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for "Gift Completed" button for owner
  const giftCompletedBtn = await page.$(
    'button:has-text("Gift Completed"), button:has-text("Mark Complete"), [data-testid="gift-completed"]'
  );

  await screenshot('15-gift-completion');

  if (!giftCompletedBtn) {
    throw new Error('Gift flow: Completion button not found (feature not implemented)');
  }
}

async function testTradeFlow_ViewBooks() {
  // For exchange posts, owner should see "View available books" to browse requester's books
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for "View available books" link in a thread
  const viewBooksLink = await page.$(
    'a:has-text("View available books"), button:has-text("View books"), [data-testid="view-requester-books"]'
  );

  await screenshot('16-trade-view-books');

  if (!viewBooksLink) {
    throw new Error('Trade flow: View available books link not found (feature not implemented)');
  }
}

async function testTradeFlow_Proposal() {
  // Owner should be able to propose a trade via handshake icon on requester's books
  await loginAs(testOwner.username);

  // Navigate to another user's profile to see their books
  await page.goto(`${BASE_URL}/profile/${testRequester.username}`);
  await waitForNavigation();

  // Look for handshake/trade icon on their books
  const tradeIcon = await page.$(
    '[data-testid="trade-icon"], button[aria-label*="trade" i], .trade-proposal-btn'
  );

  await screenshot('17-trade-proposal');

  if (!tradeIcon) {
    throw new Error('Trade flow: Trade proposal icon not found (feature not implemented)');
  }
}

async function testTradeFlow_AcceptDecline() {
  // Requester should see Accept/Decline buttons on trade proposals
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Look for trade proposal with Accept/Decline
  const acceptBtn = await page.$('button:has-text("Accept"), [data-testid="accept-trade"]');
  const declineBtn = await page.$('button:has-text("Decline"), [data-testid="decline-trade"]');

  await screenshot('18-trade-accept-decline');

  if (!acceptBtn || !declineBtn) {
    throw new Error('Trade flow: Accept/Decline buttons not found (feature not implemented)');
  }
}

async function testLoanFlow_CreateLoan() {
  // User should be able to create a loan post with duration
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for loan type option in post creation
  const loanOption = await page.$(
    'input[value="loan"], button:has-text("Loan"), [data-testid="post-type-loan"]'
  );

  await screenshot('19-loan-create');

  if (!loanOption) {
    throw new Error('Loan flow: Loan post type option not found (feature not implemented)');
  }
}

async function testLoanFlow_DurationPicker() {
  // When creating loan, should see duration picker (30/60/90 days)
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Try to find loan duration selector
  const durationPicker = await page.$(
    'select[name*="duration"], [data-testid="loan-duration"], input[name*="days"]'
  );

  await screenshot('20-loan-duration');

  if (!durationPicker) {
    throw new Error('Loan flow: Duration picker not found (feature not implemented)');
  }
}

async function testLoanFlow_OnLoanStatus() {
  // Active loans should show "On loan" overlay with due date
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for on-loan indicator
  const onLoanIndicator = await page.$(
    '[data-testid="on-loan-status"], .on-loan-overlay, :has-text("On loan to")'
  );

  await screenshot('21-loan-status');

  if (!onLoanIndicator) {
    throw new Error('Loan flow: On loan status indicator not found (feature not implemented)');
  }
}

async function testLoanFlow_Return() {
  // Borrower should be able to mark loan as returned
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Look for return button
  const returnBtn = await page.$(
    'button:has-text("Returned"), button:has-text("Mark Returned"), [data-testid="loan-returned"]'
  );

  await screenshot('22-loan-return');

  if (!returnBtn) {
    throw new Error('Loan flow: Return button not found (feature not implemented)');
  }
}

async function testDeclineRequest() {
  // Owner should be able to decline a request
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Look for decline button on a request
  const declineBtn = await page.$(
    'button:has-text("Decline"), button:has-text("No thanks"), [data-testid="decline-request"]'
  );

  await screenshot('23-decline-request');

  if (!declineBtn) {
    throw new Error('Decline flow: Decline button not found (feature not implemented)');
  }
}

async function testCancelRequest() {
  // Requester should be able to cancel their interest
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Look for cancel/withdraw button
  const cancelBtn = await page.$(
    'button:has-text("Cancel"), button:has-text("Withdraw"), [data-testid="cancel-request"]'
  );

  await screenshot('24-cancel-request');

  if (!cancelBtn) {
    throw new Error('Cancel flow: Cancel request button not found (feature not implemented)');
  }
}

async function testDismissNotification() {
  // User should be able to dismiss notifications about declined/cancelled requests
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Look for dismiss button
  const dismissBtn = await page.$(
    'button:has-text("Dismiss"), button[aria-label*="dismiss" i], [data-testid="dismiss-notification"]'
  );

  await screenshot('25-dismiss-notification');

  if (!dismissBtn) {
    throw new Error('Dismiss flow: Dismiss button not found (feature not implemented)');
  }
}

async function testMessageThreadStatus() {
  // Message threads should show their status (active, accepted, declined, etc.)
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Look for thread status indicator
  const statusIndicator = await page.$(
    '[data-testid="thread-status"], .thread-status, [class*="status"]'
  );

  await screenshot('26-thread-status');

  // This is more of a documentation test - threads should have visible status
  log('Thread status test: checking for status indicators in message threads');
}

// ============================================================================
// COMPREHENSIVE TRADE FLOW TEST
// Tests the complete exchange flow from post creation to completion
// ============================================================================

// Test book data for trade flow
const tradeTestOwnerBook = {
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
};

const tradeTestRequesterBook = {
  title: '1984',
  author: 'George Orwell',
};

// Helper: Create an exchange post
async function createExchangePost(bookTitle: string, bookAuthor: string): Promise<string | null> {
  step(`Creating exchange post for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  step('Clicking Share a Book button');
  const shareButton = await page.$('button:has-text("Share a Book")');
  if (shareButton) {
    await shareButton.click();
    await page.waitForTimeout(500);
  }

  step('Waiting for book search input');
  await page.waitForSelector('input[placeholder*="Search for a book" i]', { timeout: 5000 }).catch(() => {});

  const bookSearchInput = await page.$('input[placeholder*="Search for a book" i]');
  if (!bookSearchInput) {
    throw new Error('Book search input not found');
  }

  step(`Searching for book: ${bookTitle}`);
  await bookSearchInput.fill(bookTitle);
  await page.waitForTimeout(1500);

  step('Selecting search result');
  const searchResult = await page.$('[role="option"], [class*="search-result"], .cursor-pointer');
  if (searchResult) {
    await searchResult.click();
    await page.waitForTimeout(500);
  } else {
    step('No search results, trying manual entry');
    const manualEntryBtn = await page.$('button:has-text("Add manually"), button:has-text("Enter manually")');
    if (manualEntryBtn) {
      await manualEntryBtn.click();
      await page.waitForTimeout(300);
      const titleInput = await page.$('input[id="manualTitle"], input[placeholder*="Title"]');
      const authorInput = await page.$('input[id="manualAuthor"], input[placeholder*="Author"]');
      if (titleInput) await titleInput.fill(bookTitle);
      if (authorInput) await authorInput.fill(bookAuthor);
      const addManualBtn = await page.$('button:has-text("Add Book")');
      if (addManualBtn) await addManualBtn.click();
    }
  }

  await page.waitForTimeout(500);

  step('Selecting Exchange type');
  const exchangeTypeBtn = await page.$('button:has-text("Exchange")');
  if (exchangeTypeBtn) {
    await exchangeTypeBtn.click();
    await page.waitForTimeout(300);
  }

  step('Submitting share form');
  const submitBtn = await page.$('button:has-text("Share Book")');
  if (submitBtn) {
    await submitBtn.click();
  }

  await page.waitForTimeout(2000);

  step('Verifying post was created');
  const bookCard = await page.$(`text="${bookTitle}"`);
  if (!bookCard) {
    throw new Error(`Book "${bookTitle}" not found after creation`);
  }

  return null;
}

// Helper: Send a request for a book
async function sendRequestForBook(ownerUsername: string, bookTitle: string): Promise<void> {
  step(`Sending request for "${bookTitle}" from ${ownerUsername}`);
  await page.goto(`${BASE_URL}/profile/${ownerUsername}`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  step(`Finding book "${bookTitle}" on profile`);
  const bookCard = await page.locator(`text="${bookTitle}"`).first();
  const isVisible = await bookCard.isVisible().catch(() => false);
  if (!isVisible) {
    throw new Error(`Book "${bookTitle}" not found on profile`);
  }

  step('Clicking Request button');
  const requestBtn = await page.$('button:has-text("Request")');
  if (!requestBtn) {
    throw new Error('Request button not found');
  }

  await requestBtn.click();
  await page.waitForTimeout(500);

  step('Filling in message');
  const messageInput = await page.$('textarea[placeholder*="interested in this book" i], textarea');
  if (messageInput) {
    await messageInput.fill(`Hi! I'm interested in "${bookTitle}". Would love to trade!`);
  } else {
    throw new Error('Message textarea not found');
  }

  step('Clicking Send button');
  const sendBtn = await page.$('button:has-text("Send")');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    throw new Error('Send button not found');
  }

  await page.waitForTimeout(1500);
}

async function testCompleteTradeFlow() {
  log('=== COMPREHENSIVE TRADE FLOW TEST ===');
  log('This test covers the complete exchange flow from post creation to completion');

  // Step 1: Owner creates an exchange post
  step('Step 1: Owner creates an exchange post');
  await loginAs(testOwner.username);
  await createExchangePost(tradeTestOwnerBook.title, tradeTestOwnerBook.author);
  await screenshot('trade-01-owner-post-created');

  // Step 2: Requester creates their exchange post
  step('Step 2: Requester creates an exchange post');
  await logout();
  await loginAs(testRequester.username);
  await createExchangePost(tradeTestRequesterBook.title, tradeTestRequesterBook.author);
  await screenshot('trade-02-requester-post-created');

  // Step 3: Requester sends request for owner's book
  step('Step 3: Requester requests owner\'s book');
  await sendRequestForBook(testOwner.username, tradeTestOwnerBook.title);
  await screenshot('trade-03-request-sent');

  // Step 4: Owner sees interest on Share page
  step('Step 4: Owner views Share page and sees interest');
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  // Look for interest indicator - ShareCard shows "Someone is interested!" or "X people are interested!"
  const interestIndicator = await page.$(
    'text="is interested", text="are interested", button:has-text("interested")'
  );
  await screenshot('trade-04-owner-sees-interest');

  if (!interestIndicator) {
    throw new Error('Interest indicator not visible on Share page');
  }
  await interestIndicator.click();
  await page.waitForTimeout(500);

  // Step 5: Owner clicks View Books to see requester's profile
  log('Step 5: Owner navigates to requester\'s profile to view their books');

  // On ShareCard, for exchange posts, there's a "View Books" link that goes to /profile/:username?tradeFor=...
  const viewBooksLink = await page.$('a:has-text("View Books")');
  if (viewBooksLink) {
    await viewBooksLink.click();
    await waitForNavigation();
  } else {
    // Navigate directly to requester's profile with trade context
    // We need to construct the URL with tradeFor parameter
    await page.goto(`${BASE_URL}/profile/${testRequester.username}`);
    await waitForNavigation();
  }
  await page.waitForTimeout(1000);
  await screenshot('trade-05-owner-views-requester-profile');

  // Step 6: Owner proposes exchange
  log('Step 6: Owner proposes exchange for requester\'s book');

  // Check for Exchange Available banner on profile page
  const exchangeBanner = await page.$('text="Exchange Available"');
  if (exchangeBanner) {
    log('  Exchange Available banner found');
  }

  // Find the Exchange button on the requester's book card
  const exchangeBtn = await page.$('button:has-text("Exchange")');
  if (!exchangeBtn) {
    throw new Error('Exchange button not found on requester\'s profile');
  }

  await exchangeBtn.click();
  await page.waitForTimeout(500);

  // Handle "Propose Exchange" confirmation dialog
  const confirmExchangeBtn = await page.$('button:has-text("Propose Exchange")');
  if (confirmExchangeBtn) {
    await confirmExchangeBtn.click();
  }
  await page.waitForTimeout(1500);
  await screenshot('trade-06-exchange-proposed');

  // Step 7: Verify trade proposal appears in owner's Share page
  log('Step 7: Verify trade proposal appears in owner\'s Share page thread');

  // After proposing, we should be redirected to /share?focusPost=...&showThread=...
  await page.waitForTimeout(1000);
  const currentUrl = page.url();
  if (!currentUrl.includes('/share')) {
    await page.goto(`${BASE_URL}/share`);
    await waitForNavigation();
  }
  await page.waitForTimeout(1000);

  // The thread should be auto-expanded after proposal
  // Look for the trade proposal card in the message thread
  const proposalCard = await page.$('[class*="trade"], text="Exchange"');
  await screenshot('trade-07-owner-sees-proposal');

  // Step 8: Requester sees and accepts the trade proposal
  log('Step 8: Requester views and accepts trade proposal');
  await logout();
  await loginAs(testRequester.username);

  // Requester goes to Activity page (messages page shows their requests)
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  // Find and click on the thread for owner's book
  const threadItem = await page.$(`button:has-text("${tradeTestOwnerBook.title}")`);
  if (threadItem) {
    await threadItem.click();
    await page.waitForTimeout(1000);
  }

  await screenshot('trade-08-requester-views-proposal');

  // Look for trade proposal card with Accept button
  // The proposal card shows the book cover and has Accept/Decline buttons
  const acceptBtn = await page.$('button:has-text("Accept")');
  if (!acceptBtn) {
    throw new Error('Accept button not found for trade proposal');
  }

  await acceptBtn.click();
  await page.waitForTimeout(1500);
  await screenshot('trade-09-proposal-accepted');

  // Step 9: Verify both users see confirm buttons
  log('Step 9: Verify both users see confirm buttons after acceptance');

  // After accepting, the thread status becomes 'accepted' and requester should see confirm button
  // The button says "Trade Completed" for exchange posts
  await page.waitForTimeout(500);
  let requesterConfirmBtn = await page.$('button:has-text("Trade Completed")');
  if (!requesterConfirmBtn) {
    // Try reloading once to see updated status
    await page.reload();
    await page.waitForTimeout(1000);
    requesterConfirmBtn = await page.$('button:has-text("Trade Completed")');
  }
  await screenshot('trade-10-requester-confirm-button');
  if (!requesterConfirmBtn) {
    throw new Error('Requester confirm button not found after accepting trade proposal');
  }

  // Check owner's view on their Share page
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  // Owner sees "Gift Completed" button on agreed_upon posts
  const ownerConfirmBtn = await page.$('button:has-text("Gift Completed")');
  await screenshot('trade-11-owner-confirm-button');
  if (!ownerConfirmBtn) {
    throw new Error('Owner confirm button not found on Share page');
  }

  // Step 10: Verify book disappears from browse feed
  log('Step 10: Verify book no longer appears in browse feed');
  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  // Search for the owner's book
  const searchInput = await page.$('input[placeholder*="Title" i], input[placeholder*="search" i]');
  if (searchInput) {
    await searchInput.fill(tradeTestOwnerBook.title);
    await page.waitForTimeout(1500);
  }

  // Check if book is visible in browse results
  // It should NOT be there since status changed to agreed_upon
  const bookInBrowse = await page.$(`text="${tradeTestOwnerBook.title}"`);
  await screenshot('trade-12-book-not-in-browse');

  if (bookInBrowse) {
    throw new Error('Book still visible in browse after being agreed upon for trade');
  }
  log('  Verified: Book no longer appears in browse feed');

  // Step 11: Owner confirms completion
  log('Step 11: Owner confirms the trade is complete');
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  const ownerCompleteBtn = await page.$('button:has-text("Gift Completed")');
  if (!ownerCompleteBtn) {
    throw new Error('Owner complete button not found on Share page');
  }
  await ownerCompleteBtn.click();
  await page.waitForTimeout(500);

  // Handle confirmation dialog - button says "Yes, I gave it"
  const confirmDialogBtn = await page.$('button:has-text("Yes, I gave it"), button:has-text("Yes")');
  if (confirmDialogBtn) {
    await confirmDialogBtn.click();
  }
  await page.waitForTimeout(1500);
  await screenshot('trade-13-owner-confirmed');

  // Step 12: Requester confirms completion
  log('Step 12: Requester confirms receipt');
  await logout();
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  // Select the thread if needed
  const requesterThread = await page.$(`button:has-text("${tradeTestOwnerBook.title}")`);
  if (requesterThread) {
    await requesterThread.click();
    await page.waitForTimeout(500);
  }

  // Requester sees "Trade Completed" button for exchange posts
  const requesterCompleteBtn = await page.$('button:has-text("Trade Completed")');
  if (!requesterCompleteBtn) {
    throw new Error('Requester complete button not found on Activity page');
  }
  await requesterCompleteBtn.click();
  await page.waitForTimeout(500);

  // Handle confirmation dialog - for exchange it says "Yes, trade completed"
  const confirmReceiptBtn = await page.$('button:has-text("Yes, trade completed"), button:has-text("Yes")');
  if (confirmReceiptBtn) {
    await confirmReceiptBtn.click();
  }
  await page.waitForTimeout(1500);
  await screenshot('trade-14-requester-confirmed');

  // Step 13: Verify book moved to owner's archive
  log('Step 13: Verify book moved to owner\'s archive');
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  // Click Active tab - book should NOT be there anymore
  const activeTab = await page.$('button:has-text("Active")');
  if (activeTab) {
    await activeTab.click();
    await page.waitForTimeout(500);
  }

  const bookInActive = await page.$(`text="${tradeTestOwnerBook.title}"`);
  await screenshot('trade-15-book-not-in-active');

  if (bookInActive) {
    throw new Error('Book still visible in Active tab after trade completion');
  }
  log('  Verified: Book no longer in Active tab');

  // Click Archive tab - book SHOULD be there
  const archiveTab = await page.$('button:has-text("Archive")');
  if (archiveTab) {
    await archiveTab.click();
    await page.waitForTimeout(500);
  }

  const bookInArchive = await page.$(`text="${tradeTestOwnerBook.title}"`);
  await screenshot('trade-16-book-in-archive');

  if (!bookInArchive) {
    throw new Error('Book should appear in archive after trade completion');
  }

  log('  Verified: Book moved to Archive tab');
  log('=== TRADE FLOW TEST COMPLETE ===');
}

// ============================================================================
// GIFT REQUEST STATE FLOW TESTS
// Tests various gift request states: cancel, re-request, decline, dismiss
// ============================================================================

const giftTestBook = {
  title: 'To Kill a Mockingbird',
  author: 'Harper Lee',
};

// Helper: Create a giveaway post
async function createGiveawayPost(bookTitle: string, bookAuthor: string): Promise<void> {
  step(`Creating giveaway post for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  step('Clicking Share a Book button');
  const shareButton = await page.$('button:has-text("Share a Book")');
  if (shareButton) {
    await shareButton.click();
    await page.waitForTimeout(500);
  }

  step('Waiting for book search input');
  await page.waitForSelector('input[placeholder*="Search for a book" i]', { timeout: 5000 }).catch(() => {});

  const bookSearchInput = await page.$('input[placeholder*="Search for a book" i]');
  if (!bookSearchInput) {
    throw new Error('Book search input not found');
  }

  step(`Searching for book: ${bookTitle}`);
  await bookSearchInput.fill(bookTitle);
  await page.waitForTimeout(1500);

  step('Selecting search result');
  const searchResult = await page.$('[role="option"], [class*="search-result"], .cursor-pointer');
  if (searchResult) {
    await searchResult.click();
    await page.waitForTimeout(500);
  }

  step('Submitting share form');
  const submitBtn = await page.$('button:has-text("Share Book")');
  if (submitBtn) {
    await submitBtn.click();
  }

  await page.waitForTimeout(2000);
}

// Helper: Cancel a request from Activity page
async function cancelRequest(bookTitle: string): Promise<void> {
  step(`Cancelling request for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  step('Selecting thread');
  const threadItem = await page.$(`button:has-text("${bookTitle}")`);
  if (threadItem) {
    await threadItem.click();
    await page.waitForTimeout(500);
  }

  step('Clicking Cancel Request button');
  const cancelBtn = await page.$('button:has-text("Cancel Request")');
  if (!cancelBtn) {
    throw new Error('Cancel Request button not found');
  }

  await cancelBtn.click();
  await page.waitForTimeout(500);

  step('Confirming cancellation');
  const confirmBtn = await page.$('button:has-text("Yes"), button:has-text("Confirm")');
  if (confirmBtn) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(1000);
}

// Helper: Decline a request from Share page
async function declineRequest(bookTitle: string, requesterUsername: string): Promise<void> {
  step(`Declining request for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  step('Expanding interest list');
  const interestIndicator = await page.$('text="is interested", text="are interested"');
  if (interestIndicator) {
    await interestIndicator.click();
    await page.waitForTimeout(500);
  }

  step('Clicking Decline button');
  const declineBtn = await page.$('button:has-text("Decline")');
  if (!declineBtn) {
    throw new Error('Decline button not found');
  }

  await declineBtn.click();
  await page.waitForTimeout(500);

  step('Confirming decline');
  const confirmBtn = await page.$('button:has-text("Yes"), button:has-text("Confirm")');
  if (confirmBtn) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(1000);
}

// Helper: Dismiss a declined notification from Activity page
async function dismissDeclinedRequest(bookTitle: string): Promise<void> {
  step(`Dismissing declined request for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  step('Selecting thread');
  const threadItem = await page.$(`button:has-text("${bookTitle}")`);
  if (threadItem) {
    await threadItem.click();
    await page.waitForTimeout(500);
  }

  step('Clicking Dismiss button');
  const dismissBtn = await page.$('button:has-text("Dismiss")');
  if (!dismissBtn) {
    throw new Error('Dismiss button not found');
  }

  await dismissBtn.click();
  await page.waitForTimeout(1000);
}

// Helper: Accept a request from Share page
async function acceptRequest(bookTitle: string): Promise<void> {
  step(`Accepting request for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  step('Expanding interest list');
  const interestIndicator = await page.$('text="is interested", text="are interested"');
  if (interestIndicator) {
    await interestIndicator.click();
    await page.waitForTimeout(500);
  }

  step('Clicking Accept button');
  const acceptBtn = await page.$('button:has-text("Accept"), button:has-text("Give to")');
  if (!acceptBtn) {
    throw new Error('Accept button not found');
  }

  await acceptBtn.click();
  await page.waitForTimeout(500);

  step('Confirming acceptance');
  const confirmBtn = await page.$('button:has-text("Yes"), button:has-text("Confirm")');
  if (confirmBtn) {
    await confirmBtn.click();
  }
  await page.waitForTimeout(1000);
}

// Helper: Get thread status from Activity page
async function getThreadStatus(bookTitle: string): Promise<string | null> {
  step(`Checking thread status for: ${bookTitle}`);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  step('Selecting thread');
  const threadItem = await page.$(`button:has-text("${bookTitle}")`);
  if (threadItem) {
    await threadItem.click();
    await page.waitForTimeout(500);
  }

  step('Reading status');
  // Look for status indicators
  const statusBanner = await page.$('[class*="status"], [data-testid="thread-status"]');
  if (statusBanner) {
    return await statusBanner.textContent();
  }

  // Check for specific status text
  const cancelledText = await page.$('text="You cancelled this request"');
  if (cancelledText) return 'cancelled_by_requester';

  const declinedText = await page.$('text="Your request was declined"');
  if (declinedText) return 'declined_by_owner';

  const acceptedText = await page.$('text="accepted", text="Accepted"');
  if (acceptedText) return 'accepted';

  return 'active';
}

// Test 1: Gift completed successfully (happy path)
async function testGiftFlow_HappyPath() {
  log('=== GIFT FLOW: HAPPY PATH ===');

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(giftTestBook.title, giftTestBook.author);
  await screenshot('gift-happy-01-post-created');

  // Requester requests the book
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, giftTestBook.title);
  await screenshot('gift-happy-02-request-sent');

  // Owner accepts the request
  await logout();
  await loginAs(testOwner.username);
  await acceptRequest(giftTestBook.title);
  await screenshot('gift-happy-03-accepted');

  // Verify thread status is 'accepted'
  await logout();
  await loginAs(testRequester.username);
  const status = await getThreadStatus(giftTestBook.title);
  if (status !== 'accepted') {
    throw new Error(`Expected status 'accepted', got '${status}'`);
  }

  // Owner confirms completion
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  const completeBtn = await page.$('button:has-text("Gift Completed")');
  if (completeBtn) {
    await completeBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = await page.$('button:has-text("Yes, I gave it")');
    if (confirmBtn) await confirmBtn.click();
  }
  await screenshot('gift-happy-04-owner-confirmed');

  // Requester confirms receipt
  await logout();
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  const receiveBtn = await page.$('button:has-text("Received")');
  if (receiveBtn) {
    await receiveBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = await page.$('button:has-text("Yes")');
    if (confirmBtn) await confirmBtn.click();
  }
  await screenshot('gift-happy-05-requester-confirmed');

  // Verify book in owner's archive
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  const archiveTab = await page.$('button:has-text("Archive")');
  if (archiveTab) await archiveTab.click();
  await page.waitForTimeout(500);

  const bookInArchive = await page.$(`text="${giftTestBook.title}"`);
  await screenshot('gift-happy-06-in-archive');

  if (!bookInArchive) {
    throw new Error('Book should be in archive after completion');
  }

  log('Gift happy path completed successfully');
}

// Test 2: Requester cancels, then re-requests (thread reopens)
async function testGiftFlow_CancelAndRerequest() {
  log('=== GIFT FLOW: CANCEL AND RE-REQUEST ===');

  const testBook = { title: 'Pride and Prejudice', author: 'Jane Austen' };

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);
  await screenshot('gift-cancel-01-post-created');

  // Requester requests the book
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);
  await screenshot('gift-cancel-02-first-request');

  // Requester cancels
  await cancelRequest(testBook.title);
  await screenshot('gift-cancel-03-cancelled');

  // Verify status is cancelled
  let status = await getThreadStatus(testBook.title);
  if (status !== 'cancelled_by_requester') {
    throw new Error(`Expected 'cancelled_by_requester', got '${status}'`);
  }

  // Requester requests again (same book, should reopen thread)
  await sendRequestForBook(testOwner.username, testBook.title);
  await screenshot('gift-cancel-04-re-requested');

  // Verify thread is active again
  status = await getThreadStatus(testBook.title);
  if (status !== 'active') {
    throw new Error(`Expected thread to reopen to 'active', got '${status}'`);
  }

  // Verify message history is preserved (both messages visible)
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  const threadItem = await page.$(`button:has-text("${testBook.title}")`);
  if (threadItem) {
    await threadItem.click();
    await page.waitForTimeout(500);
  }

  // Check for system message about cancellation
  const cancelSystemMsg = await page.$('text="cancelled"');
  await screenshot('gift-cancel-05-history-preserved');

  if (!cancelSystemMsg) {
    throw new Error('Cancel history message should be visible');
  }

  log('Cancel and re-request flow completed');
}

// Test 3: Requester cancels and stays cancelled
async function testGiftFlow_CancelStaysCancelled() {
  log('=== GIFT FLOW: CANCEL STAYS CANCELLED ===');

  const testBook = { title: 'The Catcher in the Rye', author: 'J.D. Salinger' };

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);

  // Requester requests then cancels
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);
  await cancelRequest(testBook.title);
  await screenshot('gift-stay-cancelled-01');

  // Verify status remains cancelled
  const status = await getThreadStatus(testBook.title);
  if (status !== 'cancelled_by_requester') {
    throw new Error(`Expected 'cancelled_by_requester', got '${status}'`);
  }

  // Verify thread is visible in Activity with cancel banner
  const cancelBanner = await page.$('text="You cancelled this request"');
  await screenshot('gift-stay-cancelled-02');

  if (!cancelBanner) {
    throw new Error('Cancel banner should be visible');
  }

  log('Cancel stays cancelled flow completed');
}

// Test 4: Owner declines, requester dismisses
async function testGiftFlow_DeclineAndDismiss() {
  log('=== GIFT FLOW: DECLINE AND DISMISS ===');

  const testBook = { title: 'Brave New World', author: 'Aldous Huxley' };

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);

  // Requester requests
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);

  // Owner declines
  await logout();
  await loginAs(testOwner.username);
  await declineRequest(testBook.title, testRequester.username);
  await screenshot('gift-decline-01-declined');

  // Requester sees decline and dismisses
  await logout();
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Verify declined status shown
  const declinedText = await page.$('text="Your request was declined"');
  await screenshot('gift-decline-02-requester-sees');

  if (!declinedText) {
    throw new Error('Decline message should be visible to requester');
  }

  // Dismiss the notification
  await dismissDeclinedRequest(testBook.title);
  await screenshot('gift-decline-03-dismissed');

  log('Decline and dismiss flow completed');
}

// Test 5: Owner declines, requester does NOT dismiss
async function testGiftFlow_DeclineNoDismiss() {
  log('=== GIFT FLOW: DECLINE WITHOUT DISMISS ===');

  const testBook = { title: 'Fahrenheit 451', author: 'Ray Bradbury' };

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);

  // Requester requests
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);

  // Owner declines
  await logout();
  await loginAs(testOwner.username);
  await declineRequest(testBook.title, testRequester.username);

  // Requester sees decline message but doesn't dismiss
  await logout();
  await loginAs(testRequester.username);
  const status = await getThreadStatus(testBook.title);
  await screenshot('gift-decline-no-dismiss-01');

  if (status !== 'declined_by_owner') {
    throw new Error(`Expected 'declined_by_owner', got '${status}'`);
  }

  // Verify decline banner is visible
  const declineBanner = await page.$('text="Your request was declined"');
  if (!declineBanner) {
    throw new Error('Decline banner should remain visible until dismissed');
  }

  log('Decline without dismiss flow completed');
}

// Test 6: Multiple requesters, one accepted (given_to_other)
async function testGiftFlow_MultipleRequesters() {
  log('=== GIFT FLOW: MULTIPLE REQUESTERS ===');

  const testBook = { title: 'The Hobbit', author: 'J.R.R. Tolkien' };

  // Create a third test user
  const thirdUser = {
    email: `third${timestamp}@example.com`,
    username: `third${timestamp}`,
    bio: 'Third test user',
  };

  await logout();
  await createUser(thirdUser);

  // Owner creates a giveaway
  await logout();
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);

  // First requester requests
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);
  await screenshot('gift-multi-01-first-request');

  // Second requester requests
  await logout();
  await loginAs(thirdUser.username);
  await sendRequestForBook(testOwner.username, testBook.title);
  await screenshot('gift-multi-02-second-request');

  // Owner accepts first requester
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Expand interest list
  const interestIndicator = await page.$('text="are interested"');
  if (interestIndicator) {
    await interestIndicator.click();
    await page.waitForTimeout(500);
  }

  // Accept the first requester specifically
  const acceptBtn = await page.$(`button:has-text("Accept")`);
  if (acceptBtn) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = await page.$('button:has-text("Yes")');
    if (confirmBtn) await confirmBtn.click();
  }
  await screenshot('gift-multi-03-first-accepted');

  // Second requester should see "given to someone else"
  await logout();
  await loginAs(thirdUser.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  const givenToOtherText = await page.$('text="given to someone else", text="Given to another"');
  await screenshot('gift-multi-04-given-to-other');

  if (!givenToOtherText) {
    throw new Error('"Given to someone else" message should be visible to second requester');
  }

  log('Multiple requesters flow completed');
}

// Test 7: Request after being declined should NOT work
async function testGiftFlow_CantRerequestAfterDecline() {
  log('=== GIFT FLOW: CANNOT RE-REQUEST AFTER DECLINE ===');

  const testBook = { title: 'Animal Farm', author: 'George Orwell' };

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);

  // Requester requests
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);

  // Owner declines
  await logout();
  await loginAs(testOwner.username);
  await declineRequest(testBook.title, testRequester.username);

  // Requester dismisses
  await logout();
  await loginAs(testRequester.username);
  await dismissDeclinedRequest(testBook.title);
  await screenshot('gift-cant-rerequest-01-dismissed');

  // Requester tries to request again by sending a message
  // The thread should stay 'dismissed', not reopen
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();

  // Try to find the thread and send a message
  const threadItem = await page.$(`button:has-text("${testBook.title}")`);
  if (threadItem) {
    await threadItem.click();
    await page.waitForTimeout(500);

    // Try to send a message
    const messageInput = await page.$('textarea, input[type="text"][placeholder*="message" i]');
    if (messageInput) {
      await messageInput.fill('Can I please have this book?');
      const sendBtn = await page.$('button:has-text("Send")');
      if (sendBtn) {
        await sendBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  }
  await screenshot('gift-cant-rerequest-02-tried-message');

  // Verify status is still 'dismissed' (should NOT reopen)
  const status = await getThreadStatus(testBook.title);
  if (status === 'active') {
    throw new Error('Thread should NOT reopen after dismiss - owner already declined');
  }

  log('Cannot re-request after decline - verified');
}

// Test 8: Owner deletes post mid-conversation
async function testGiftFlow_PostDeleted() {
  log('=== GIFT FLOW: POST DELETED MID-CONVERSATION ===');

  const testBook = { title: 'Lord of the Flies', author: 'William Golding' };

  // Owner creates a giveaway
  await loginAs(testOwner.username);
  await createGiveawayPost(testBook.title, testBook.author);

  // Requester requests
  await logout();
  await loginAs(testRequester.username);
  await sendRequestForBook(testOwner.username, testBook.title);
  await screenshot('gift-deleted-01-requested');

  // Owner deletes the post
  await logout();
  await loginAs(testOwner.username);
  await page.goto(`${BASE_URL}/share`);
  await waitForNavigation();

  // Find post menu and delete
  const menuBtn = await page.$('button[aria-label*="menu" i], button:has([class*="ellipsis"]), .post-menu-btn');
  if (menuBtn) {
    await menuBtn.click();
    await page.waitForTimeout(300);
  }

  const deleteBtn = await page.$('button:has-text("Delete")');
  if (deleteBtn) {
    await deleteBtn.click();
    await page.waitForTimeout(500);
    const confirmBtn = await page.$('button:has-text("Delete"), button:has-text("Confirm")');
    if (confirmBtn) await confirmBtn.click();
  }
  await screenshot('gift-deleted-02-post-deleted');

  // Requester should see "post removed" status
  await logout();
  await loginAs(testRequester.username);
  await page.goto(`${BASE_URL}/activity`);
  await waitForNavigation();
  await page.waitForTimeout(1000);

  const postRemovedText = await page.$('text="removed", text="deleted", text="no longer available"');
  await screenshot('gift-deleted-03-requester-sees');

  if (!postRemovedText) {
    throw new Error('Post removed message should be visible to requester');
  }

  log('Post deleted mid-conversation flow completed');
}

// Run all gift state tests
async function testGiftStateFlows() {
  log('\n=== RUNNING GIFT STATE FLOW TESTS ===\n');

  await runTest('Gift Flow: Happy Path', 'feature', testGiftFlow_HappyPath);
  await runTest('Gift Flow: Cancel and Re-request', 'feature', testGiftFlow_CancelAndRerequest);
  await runTest('Gift Flow: Cancel Stays Cancelled', 'feature', testGiftFlow_CancelStaysCancelled);
  await runTest('Gift Flow: Decline and Dismiss', 'feature', testGiftFlow_DeclineAndDismiss);
  await runTest('Gift Flow: Decline Without Dismiss', 'feature', testGiftFlow_DeclineNoDismiss);
  await runTest('Gift Flow: Multiple Requesters', 'feature', testGiftFlow_MultipleRequesters);
  await runTest('Gift Flow: Cannot Re-request After Decline', 'feature', testGiftFlow_CantRerequestAfterDecline);
  await runTest('Gift Flow: Post Deleted Mid-Conversation', 'feature', testGiftFlow_PostDeleted);

  log('\n=== GIFT STATE FLOW TESTS COMPLETE ===\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Initialize log file
  fs.writeFileSync(LOG_PATH, `# BookSharePDX E2E Test Log\n\n`);
  appendToLog(`**Test Run Started:** ${new Date().toISOString()}\n`);
  appendToLog(`**Base URL:** ${BASE_URL}\n`);
  appendToLog(`**Test Owner:** ${testOwner.username}\n`);
  appendToLog(`**Test Requester:** ${testRequester.username}\n`);
  appendToLog(`---\n`);

  log('Starting E2E tests...');
  log(`Test owner: ${testOwner.username}`);
  log(`Test requester: ${testRequester.username}`);

  try {
    browser = await chromium.launch({ headless: process.env.HEADED ? false : true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(5000);

    // ========== CORE TESTS ==========
    log('\n=== CORE TESTS ===');
    await runTest('Backend Health', 'core', testBackendHealth);

    // Skip remaining tests if backend is down
    if (!backendHealthy) {
      log('Skipping remaining tests - backend is unhealthy');
    } else if (testFilter === 'trade') {
      // Run only the trade flow test
      log('\n=== RUNNING ONLY: TRADE FLOW TEST ===');

      // First create the test users
      await runTest('Signup Flow', 'core', testSignupFlow);
      await logout();
      await createUser(testRequester);

      // Then run the trade test
      await runTest('Complete Trade Flow', 'feature', testCompleteTradeFlow);
    } else if (testFilter === 'gift') {
      // Run only the gift state flow tests
      log('\n=== RUNNING ONLY: GIFT STATE FLOW TESTS ===');

      // First create the test users
      await runTest('Signup Flow', 'core', testSignupFlow);
      await logout();
      await createUser(testRequester);

      // Then run the gift state tests
      await testGiftStateFlows();
    } else {
      await runTest('Landing Page', 'core', testLandingPage);
      await runTest('Signup Flow', 'core', testSignupFlow);
      await runTest('Login Flow', 'core', testLoginFlow);
      await runTest('Browse Page', 'core', testBrowsePage);
      await runTest('Profile Page', 'core', testProfilePage);
      await runTest('Share Page Load', 'core', testSharePageLoad);
      await runTest('Create Giveaway Post', 'core', testCreateGiveawayPost);
      await runTest('Responsive Design', 'core', testResponsiveDesign);
      await runTest('Navigation', 'core', testNavigation);
      await runTest('404 Page', 'core', test404Page);

      // ========== FEATURE TESTS ==========
      log('\n=== FEATURE TESTS (may fail until implemented) ===');

      // Interest tracking
      await runTest('Interest Banner', 'feature', testInterestBanner);

      // Gift flow
      await runTest('Gift Flow: Select Recipient', 'feature', testGiftFlow_SelectRecipient);
      await runTest('Gift Flow: Completion', 'feature', testGiftFlow_Completion);

      // Trade flow
      await runTest('Trade Flow: View Books', 'feature', testTradeFlow_ViewBooks);
      await runTest('Trade Flow: Proposal', 'feature', testTradeFlow_Proposal);
      await runTest('Trade Flow: Accept/Decline', 'feature', testTradeFlow_AcceptDecline);

      // Loan flow
      await runTest('Loan Flow: Create Loan', 'feature', testLoanFlow_CreateLoan);
      await runTest('Loan Flow: Duration Picker', 'feature', testLoanFlow_DurationPicker);
      await runTest('Loan Flow: On Loan Status', 'feature', testLoanFlow_OnLoanStatus);
      await runTest('Loan Flow: Return', 'feature', testLoanFlow_Return);

      // Request management
      await runTest('Decline Request', 'feature', testDeclineRequest);
      await runTest('Cancel Request', 'feature', testCancelRequest);
      await runTest('Dismiss Notification', 'feature', testDismissNotification);
      await runTest('Message Thread Status', 'feature', testMessageThreadStatus);

      // Comprehensive trade flow test
      log('\n=== COMPREHENSIVE TRADE FLOW TEST ===');
      await runTest('Complete Trade Flow', 'feature', testCompleteTradeFlow);

      // Gift state flow tests
      await testGiftStateFlows();
    }

  } catch (error) {
    log(`Fatal error: ${error}`);
    appendToLog(`\n## Fatal Error\n\n\`\`\`\n${error}\n\`\`\`\n`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Write results to log
  const coreTests = results.filter(r => r.category === 'core');
  const featureTests = results.filter(r => r.category === 'feature');

  appendToLog(`\n## Core Test Results\n`);
  appendToLog(`| Test | Status | Duration |`);
  appendToLog(`|------|--------|----------|`);
  for (const result of coreTests) {
    const statusIcon = result.passed ? '✅' : '❌';
    appendToLog(`| ${result.name} | ${statusIcon} | ${result.duration}ms |`);
  }

  appendToLog(`\n## Feature Test Results (New Features)\n`);
  appendToLog(`| Test | Status | Duration |`);
  appendToLog(`|------|--------|----------|`);
  for (const result of featureTests) {
    const statusIcon = result.passed ? '✅' : '⏳';
    appendToLog(`| ${result.name} | ${statusIcon} | ${result.duration}ms |`);
  }

  const corePassed = coreTests.filter(r => r.passed).length;
  const coreFailed = coreTests.filter(r => !r.passed).length;
  const featurePassed = featureTests.filter(r => r.passed).length;
  const featurePending = featureTests.filter(r => !r.passed).length;

  appendToLog(`\n## Summary\n`);
  appendToLog(`### Core Tests`);
  appendToLog(`- **Total:** ${coreTests.length}`);
  appendToLog(`- **Passed:** ${corePassed}`);
  appendToLog(`- **Failed:** ${coreFailed}`);
  appendToLog(`- **Success Rate:** ${((corePassed / coreTests.length) * 100).toFixed(1)}%`);

  appendToLog(`\n### Feature Tests (New Features)`);
  appendToLog(`- **Total:** ${featureTests.length}`);
  appendToLog(`- **Implemented:** ${featurePassed}`);
  appendToLog(`- **Pending:** ${featurePending}`);
  appendToLog(`- **Progress:** ${((featurePassed / featureTests.length) * 100).toFixed(1)}%`);

  if (coreFailed > 0) {
    appendToLog(`\n## Failed Core Tests (Bugs)\n`);
    for (const result of coreTests.filter(r => !r.passed)) {
      appendToLog(`### ${result.name}\n`);
      appendToLog(`\`\`\`\n${result.error}\n\`\`\`\n`);
    }
  }

  if (featurePending > 0) {
    appendToLog(`\n## Pending Feature Tests\n`);
    appendToLog(`These tests document expected behavior for features not yet implemented:\n`);
    for (const result of featureTests.filter(r => !r.passed)) {
      appendToLog(`- **${result.name}**: ${result.error}`);
    }
  }

  appendToLog(`\n---\n**Test Run Completed:** ${new Date().toISOString()}`);

  log(`\n========== RESULTS ==========`);
  log(`Core Tests: ${corePassed}/${coreTests.length} passed`);
  log(`Feature Tests: ${featurePassed}/${featureTests.length} implemented`);
  log(`Results written to TEST_LOG.md`);

  // Exit with error only if core tests fail (feature tests are expected to fail)
  process.exit(coreFailed > 0 ? 1 : 0);
}

main();
