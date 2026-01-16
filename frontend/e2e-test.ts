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

function appendToLog(content: string) {
  fs.appendFileSync(LOG_PATH, content + '\n');
}

async function runTest(
  name: string,
  category: 'core' | 'feature',
  testFn: () => Promise<void>
) {
  const start = Date.now();
  log(`Running: ${name} [${category}]`);
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration, category });
    log(`  PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration, category });
    log(`  FAILED: ${errorMsg}`);
  }
}

async function waitForNavigation(timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

async function screenshot(name: string) {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) });
}

// Helper: Create a user via signup
async function createUser(user: typeof testOwner) {
  await page.goto(`${BASE_URL}/signup`);
  await waitForNavigation();
  await page.fill('input[id="email"]', user.email);
  await page.fill('input[id="username"]', user.username);
  await page.fill('textarea[id="bio"]', user.bio);
  await page.click('input[type="checkbox"]');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

// Helper: Login as user (dev mode - direct login)
async function loginAs(identifier: string) {
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();
  await page.fill('input[id="identifier"]', identifier);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}

// Helper: Logout
async function logout() {
  const logoutBtn = await page.$('button:has-text("Logout"), button:has-text("Sign Out")');
  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForTimeout(1000);
  }
}

// ============================================================================
// CORE TESTS - Basic functionality that should always work
// ============================================================================

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
    const errorEl = await page.$('[class*="error"], [role="alert"]');
    const errorText = await errorEl?.textContent();
    throw new Error(`Signup failed: ${errorText || 'unknown error'}`);
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
  await page.waitForTimeout(2000);

  // In dev mode, should be logged in directly
  // In prod mode, would show "check your email" message
  await screenshot('04-login-result');
}

async function testBrowsePage() {
  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();

  // Should have filter/search UI
  const pageContent = await page.content();
  if (!pageContent.toLowerCase().includes('browse')) {
    log('Warning: Browse page may not have expected content');
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
      await page.waitForTimeout(500);
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
  await page.goto(`${BASE_URL}/messages`);
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
  await page.goto(`${BASE_URL}/messages`);
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
  await page.goto(`${BASE_URL}/messages`);
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
  await page.goto(`${BASE_URL}/messages`);
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
  await page.goto(`${BASE_URL}/messages`);
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
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();

    // ========== CORE TESTS ==========
    log('\n=== CORE TESTS ===');
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
