import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',

  // NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
  timeout: 30000,
  expect: {
    timeout: 2000,
  },

  fullyParallel: true, // Enable parallel execution - tests are now independent
  forbidOnly: !!process.env.CI,
  retries: 0, // Fail fast, no retries
  workers: 1, // Serial execution - parallel causes timeouts on localhost

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',

    // Fast timeouts - this is localhost, should be snappy
    actionTimeout: 2000,
    navigationTimeout: 2000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
