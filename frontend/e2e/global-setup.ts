import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || "http://localhost:3001";
const BASE_URL = process.env.TEST_URL || "http://localhost:5173";

// Shared timestamp for all test users in this run
const timestamp = Date.now();

export const testUsers = {
  // Gift flow users
  giftSharer: {
    email: `giftsharer${timestamp}@example.com`,
    username: `giftsharer${timestamp}`,
    bio: "Gift flow test sharer",
  },
  giftRequester: {
    email: `giftrequester${timestamp}@example.com`,
    username: `giftrequester${timestamp}`,
    bio: "Gift flow test requester",
  },
  // Trade flow users
  tradeSharer: {
    email: `tradesharer${timestamp}@example.com`,
    username: `tradesharer${timestamp}`,
    bio: "Trade flow test sharer",
  },
  tradeRequester: {
    email: `traderequester${timestamp}@example.com`,
    username: `traderequester${timestamp}`,
    bio: "Trade flow test requester",
  },
  // Core tests user (created via UI in the test itself to test auth flow)
  coreOwner: {
    email: `owner${timestamp}@example.com`,
    username: `owner${timestamp}`,
    bio: "I love sharing books with my Portland neighbors.",
  },
};

// Write test users to a file so tests can import them
const usersFilePath = path.join(__dirname, ".test-users.json");

async function createUserAndSaveAuth(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T>
    ? T
    : never,
  user: { email: string; username: string; bio: string },
  authFile: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create user via API
  const response = await page.request.post(`${API_URL}/api/auth/signup`, {
    data: {
      email: user.email,
      username: user.username,
      bio: user.bio,
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to create user ${user.username}: ${text}`);
  }

  // The signup response sets cookies, so we need to visit the app to capture them
  await page.goto(BASE_URL);

  // Save the storage state (cookies + localStorage)
  await context.storageState({ path: authFile });
  await context.close();
}

export default async function globalSetup(config: FullConfig) {
  // Create auth directory
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Write test users to file for tests to import
  fs.writeFileSync(usersFilePath, JSON.stringify(testUsers, null, 2));

  const browser = await chromium.launch();

  try {
    // Create users and save their auth states (skip coreOwner - that's tested via UI)
    await createUserAndSaveAuth(
      browser,
      testUsers.giftSharer,
      path.join(authDir, "gift-sharer.json"),
    );
    await createUserAndSaveAuth(
      browser,
      testUsers.giftRequester,
      path.join(authDir, "gift-requester.json"),
    );
    await createUserAndSaveAuth(
      browser,
      testUsers.tradeSharer,
      path.join(authDir, "trade-sharer.json"),
    );
    await createUserAndSaveAuth(
      browser,
      testUsers.tradeRequester,
      path.join(authDir, "trade-requester.json"),
    );
  } finally {
    await browser.close();
  }
}
