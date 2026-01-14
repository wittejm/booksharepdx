/**
 * E2E Test Suite for BookSharePDX
 * Runs headless browser tests and outputs results to TEST_LOG.md
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const LOG_PATH = path.join(__dirname, '..', 'TEST_LOG.md');

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
let browser: Browser;
let page: Page;

// Unique test user for this run
const timestamp = Date.now();
const testUser = {
  email: `test${timestamp}@example.com`,
  username: `testuser${timestamp}`,
  bio: 'I love reading books and sharing them with my Portland neighbors.',
};

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function appendToLog(content: string) {
  fs.appendFileSync(LOG_PATH, content + '\n');
}

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  log(`Running: ${name}`);
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log(`  PASSED (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration });
    log(`  FAILED: ${errorMsg}`);
  }
}

async function waitForNavigation(timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

async function screenshot(name: string) {
  const screenshotDir = path.join(__dirname, '..', 'test-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`) });
}

// ============ TESTS ============

async function testLandingPage() {
  await page.goto(BASE_URL);
  await waitForNavigation();

  // Check for key elements
  const title = await page.title();
  if (!title.includes('BookShare')) {
    throw new Error(`Unexpected title: ${title}`);
  }

  // Look for signup/login buttons
  const signupBtn = await page.$('a[href="/signup"], button:has-text("Sign Up"), a:has-text("Sign Up")');
  if (!signupBtn) {
    throw new Error('Signup button not found on landing page');
  }

  await screenshot('01-landing-page');
}

async function testSignupPage() {
  await page.goto(`${BASE_URL}/signup`);
  await waitForNavigation();

  // Check form exists (no password field - passwordless auth)
  const emailInput = await page.$('input[name="email"], input[id="email"], input[type="email"]');
  const usernameInput = await page.$('input[name="username"], input[id="username"]');

  if (!emailInput || !usernameInput) {
    throw new Error('Signup form fields missing');
  }

  await screenshot('02-signup-page');
}

async function testSignupFlow() {
  await page.goto(`${BASE_URL}/signup`);
  await waitForNavigation();

  // Fill out the form (no password - passwordless auth)
  await page.fill('input[name="email"], input[id="email"]', testUser.email);
  await page.fill('input[name="username"], input[id="username"]', testUser.username);
  await page.fill('textarea[name="bio"], textarea[id="bio"]', testUser.bio);

  // Check the guidelines checkbox
  await page.click('input[type="checkbox"]');

  await screenshot('03-signup-filled');

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for response - either success navigation or error toast
  await page.waitForTimeout(3000);

  // Check if we got an error toast or navigated away
  const currentUrl = page.url();
  const errorToast = await page.$('.toast-error, [class*="error"], [role="alert"]');

  if (currentUrl.includes('/signup') && errorToast) {
    const toastText = await errorToast.textContent();
    throw new Error(`Signup failed with error: ${toastText}`);
  }

  await screenshot('04-signup-result');
}

async function testLoginPage() {
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();

  // Check form exists (magic link flow - no password field)
  const identifierInput = await page.$('input[id="identifier"], input[name="identifier"], input[type="text"]:first-of-type');

  if (!identifierInput) {
    throw new Error('Login form identifier field missing');
  }

  // Check for "Send Sign-in Link" button
  const submitBtn = await page.$('button[type="submit"]');
  const btnText = await submitBtn?.textContent();
  if (!btnText?.toLowerCase().includes('sign-in link') && !btnText?.toLowerCase().includes('send')) {
    log(`Warning: Submit button text is "${btnText}", expected "Send Sign-in Link"`);
  }

  await screenshot('05-login-page');
}

async function testLoginFlow() {
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();

  // Magic link flow - just enter identifier and request link
  await page.fill('input[id="identifier"], input[name="identifier"], input[type="text"]:first-of-type', testUser.username);

  await screenshot('06-login-filled');

  // Submit - this sends a magic link
  await page.click('button[type="submit"]');

  // Wait for response
  await page.waitForTimeout(3000);

  await screenshot('07-login-result');

  // Should show "Check your email" message or success toast
  const pageContent = await page.content();
  const hasSuccessMessage = pageContent.includes('Check your email') ||
                            pageContent.includes('sign-in link sent') ||
                            pageContent.includes('Sign-in link sent');

  if (!hasSuccessMessage) {
    const errorToast = await page.$('.toast-error, [class*="error"], [role="alert"]');
    if (errorToast) {
      const toastText = await errorToast.textContent();
      throw new Error(`Magic link request failed: ${toastText}`);
    }
  }
}

async function testBrowsePage() {
  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();

  await screenshot('08-browse-page');

  // Check for main browse elements
  const pageContent = await page.content();
  if (!pageContent.includes('Browse') && !pageContent.includes('book')) {
    log('Warning: Browse page may not have loaded correctly');
  }
}

async function testShareFlow() {
  // Navigate to profile page with share action (where the inline share form is)
  await page.goto(`${BASE_URL}/profile/${testUser.username}?action=share`);
  await waitForNavigation();

  await screenshot('09-share-flow');

  // Check if we're redirected to login (not authenticated)
  if (page.url().includes('/login')) {
    log('Redirected to login - need to be authenticated to share');
    return;
  }

  // Look for the share form / book search input
  const bookSearchInput = await page.$('input[placeholder*="search" i], input[placeholder*="book" i]');
  const shareForm = await page.$('[class*="share"], [class*="form"]');

  if (!bookSearchInput && !shareForm) {
    log('Share form elements not found - checking for profile page load');
    const profileContent = await page.content();
    if (!profileContent.includes(testUser.username)) {
      throw new Error('Profile page did not load correctly');
    }
  }
}

async function testLogout() {
  // Look for logout button or menu
  const logoutBtn = await page.$('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');

  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForTimeout(2000);
    await screenshot('10-after-logout');
  } else {
    log('Logout button not found - may not be logged in');
  }
}

async function testLoginWithEmail() {
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();

  // Try requesting magic link with email instead of username
  await page.fill('input[id="identifier"], input[name="identifier"], input[type="text"]:first-of-type', testUser.email);

  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await screenshot('11-login-with-email');

  // Should show success message for magic link sent
  const pageContent = await page.content();
  const hasSuccessMessage = pageContent.includes('Check your email') ||
                            pageContent.includes('sign-in link sent') ||
                            pageContent.includes('Sign-in link sent');

  if (!hasSuccessMessage) {
    const errorToast = await page.$('[class*="toast"], [role="alert"]');
    if (errorToast) {
      const toastText = await errorToast.textContent();
      throw new Error(`Magic link with email failed: ${toastText}`);
    }
  }
}

async function testProfilePage() {
  // Try to access profile
  await page.goto(`${BASE_URL}/profile/${testUser.username}`);
  await waitForNavigation();

  await screenshot('12-profile-page');

  const pageContent = await page.content();
  if (pageContent.includes('not found') || pageContent.includes('404')) {
    log('Profile page returned 404 - user may not exist');
  }
}

async function testBookSearch() {
  // Test the book search API directly via the browse page search
  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();

  const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[name="search"]');

  if (searchInput) {
    await searchInput.fill('Dune');
    await page.waitForTimeout(1500); // Wait for debounced search
    await screenshot('13-book-search');
  } else {
    log('Search input not found on browse page');
  }
}

async function testResponsiveDesign() {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  await waitForNavigation();
  await screenshot('14-mobile-landing');

  await page.goto(`${BASE_URL}/browse`);
  await waitForNavigation();
  await screenshot('15-mobile-browse');

  // Reset to desktop
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function testNavigationLinks() {
  await page.goto(BASE_URL);
  await waitForNavigation();

  // Check various navigation links exist
  const links = await page.$$('a[href]');
  const hrefs = await Promise.all(links.map(l => l.getAttribute('href')));

  // The landing page should have browse link and auth links
  const expectedPaths = ['/browse'];
  const authPaths = ['/login', '/signup'];

  const foundPaths = expectedPaths.filter(p => hrefs.some(h => h?.includes(p)));
  const foundAuthPaths = authPaths.filter(p => hrefs.some(h => h?.includes(p)));

  if (foundPaths.length === 0) {
    throw new Error('Browse link not found on landing page');
  }

  log(`Found navigation links: ${[...foundPaths, ...foundAuthPaths].join(', ')}`);
  await screenshot('16-navigation');
}

async function testErrorHandling() {
  // Test 404 page
  await page.goto(`${BASE_URL}/nonexistent-page-12345`);
  await waitForNavigation();
  await screenshot('17-404-page');

  // Test magic link request for non-existent user
  await page.goto(`${BASE_URL}/login`);
  await waitForNavigation();
  await page.fill('input[id="identifier"], input[type="text"]:first-of-type', 'nonexistent@example.com');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await screenshot('18-invalid-login');
}

// ============ MAIN ============

async function main() {
  // Initialize log file
  fs.writeFileSync(LOG_PATH, `# BookSharePDX E2E Test Log\n\n`);
  appendToLog(`**Test Run Started:** ${new Date().toISOString()}\n`);
  appendToLog(`**Base URL:** ${BASE_URL}\n`);
  appendToLog(`**Test User:** ${testUser.username} (${testUser.email})\n`);
  appendToLog(`---\n`);

  log('Starting E2E tests...');
  log(`Test user: ${testUser.username}`);

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();

    // Run all tests
    await runTest('Landing Page Load', testLandingPage);
    await runTest('Signup Page Load', testSignupPage);
    await runTest('Signup Flow', testSignupFlow);
    await runTest('Login Page Load', testLoginPage);
    await runTest('Login Flow (username)', testLoginFlow);
    await runTest('Browse Page', testBrowsePage);
    await runTest('Share Flow', testShareFlow);
    await runTest('Logout', testLogout);
    await runTest('Login Flow (email)', testLoginWithEmail);
    await runTest('Profile Page', testProfilePage);
    await runTest('Book Search', testBookSearch);
    await runTest('Responsive Design', testResponsiveDesign);
    await runTest('Navigation Links', testNavigationLinks);
    await runTest('Error Handling', testErrorHandling);

  } catch (error) {
    log(`Fatal error: ${error}`);
    appendToLog(`\n## Fatal Error\n\n\`\`\`\n${error}\n\`\`\`\n`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Write results to log
  appendToLog(`\n## Test Results\n`);
  appendToLog(`| Test | Status | Duration |`);
  appendToLog(`|------|--------|----------|`);

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const statusIcon = result.passed ? '✅' : '❌';
    appendToLog(`| ${result.name} | ${statusIcon} ${status} | ${result.duration}ms |`);
    if (result.passed) passed++;
    else failed++;
  }

  appendToLog(`\n## Summary\n`);
  appendToLog(`- **Total Tests:** ${results.length}`);
  appendToLog(`- **Passed:** ${passed}`);
  appendToLog(`- **Failed:** ${failed}`);
  appendToLog(`- **Success Rate:** ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    appendToLog(`\n## Failed Test Details\n`);
    for (const result of results.filter(r => !r.passed)) {
      appendToLog(`### ${result.name}\n`);
      appendToLog(`\`\`\`\n${result.error}\n\`\`\`\n`);
    }
  }

  appendToLog(`\n---\n**Test Run Completed:** ${new Date().toISOString()}`);

  log(`\nTest run complete: ${passed}/${results.length} passed`);
  log(`Results written to TEST_LOG.md`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
