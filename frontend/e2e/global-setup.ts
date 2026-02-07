import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || "http://localhost:3001";

export default async function globalSetup(config: FullConfig) {
  // Create auth directory (may still be used by legacy code)
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Verify backend is healthy before running tests
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const response = await page.request.get(`${API_URL}/api/posts`);
    if (!response.ok()) {
      throw new Error(
        `Backend health check failed: ${response.status()} ${response.statusText()}`,
      );
    }

    await context.close();
  } finally {
    await browser.close();
  }
}
