import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',

  // NOTE TO CLAUDE: KEEP LOW TIMEOUTS BECAUSE THIS APP IS SUPPOSED TO BE FAST
  timeout: 30000,
  expect: {
    timeout: 2000,
  },

  fullyParallel: false, // Tests within a file run sequentially (they share state)
  forbidOnly: !!process.env.CI,
  retries: 0, // Fail fast, no retries
  workers: process.env.CI ? 2 : 3, // Parallel across test files (each file has unique users)

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',

    // Fast timeouts
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
