import 'reflect-metadata';
import { createApp } from './app.js';
import { AppDataSource } from './config/database.js';
import { env } from './config/env.js';

async function main() {
  try {
    // Initialize database connection
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    // Create and start Express app
    const app = createApp();

    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
      console.log(`Environment: ${env.nodeEnv}`);
      console.log(`Frontend URL: ${env.frontendUrl}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
