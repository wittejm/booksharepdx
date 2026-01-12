import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'api.log');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatMessage(level: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

function writeToFile(formatted: string) {
  try {
    fs.appendFileSync(LOG_FILE, formatted + '\n');
  } catch (err) {
    // Silently fail file writes - don't break the app
  }
}

export const logger = {
  info(message: string, data?: unknown) {
    const formatted = formatMessage('INFO', message, data);
    console.log(formatted);
    writeToFile(formatted);
  },

  warn(message: string, data?: unknown) {
    const formatted = formatMessage('WARN', message, data);
    console.warn(formatted);
    writeToFile(formatted);
  },

  error(message: string, data?: unknown) {
    const formatted = formatMessage('ERROR', message, data);
    console.error(formatted);
    writeToFile(formatted);
  },

  debug(message: string, data?: unknown) {
    const formatted = formatMessage('DEBUG', message, data);
    console.log(formatted);
    writeToFile(formatted);
  },

  // Log HTTP requests
  request(method: string, path: string, status?: number, duration?: number) {
    const statusStr = status ? ` ${status}` : '';
    const durationStr = duration ? ` ${duration}ms` : '';
    const message = `${method} ${path}${statusStr}${durationStr}`;
    const formatted = formatMessage('HTTP', message);
    console.log(formatted);
    writeToFile(formatted);
  },

  // Clear log file (useful for fresh debugging sessions)
  clear() {
    try {
      fs.writeFileSync(LOG_FILE, '');
    } catch (err) {
      // Silently fail
    }
  },
};

export default logger;
