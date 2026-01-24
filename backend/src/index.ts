import "reflect-metadata";
import { createApp } from "./app.js";
import { AppDataSource } from "./config/database.js";
import { env } from "./config/env.js";
import logger from "./utils/logger.js";

async function main() {
  try {
    // Clear log file on startup for fresh debugging
    logger.clear();

    // Initialize database connection
    logger.info("Connecting to database...");
    await AppDataSource.initialize();
    logger.info("Database connected successfully");

    // Create and start Express app
    const app = createApp();

    app.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port}`);
      logger.info(`Environment: ${env.nodeEnv}`);
      logger.info(`Frontend URL: ${env.frontendUrl}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
