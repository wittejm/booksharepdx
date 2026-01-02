import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { StorageProvider } from './StorageProvider.js';
import { env } from '../../config/env.js';

/**
 * Local filesystem storage provider for development
 */
export class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.uploadDir);
    this.ensureDir();
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  async upload(file: Buffer, filename: string, mimetype: string): Promise<string> {
    // Generate unique filename
    const ext = path.extname(filename) || this.getExtFromMime(mimetype);
    const uniqueName = `${uuid()}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueName);

    await fs.writeFile(filePath, file);

    return `/uploads/${uniqueName}`;
  }

  async delete(filePath: string): Promise<void> {
    // Extract filename from URL
    const filename = filePath.replace('/uploads/', '');
    const fullPath = path.join(this.uploadDir, filename);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // File may not exist, ignore
    }
  }

  getUrl(filePath: string): string {
    // Already a URL path, return as-is
    if (filePath.startsWith('/uploads/')) {
      return filePath;
    }
    return `/uploads/${filePath}`;
  }

  private getExtFromMime(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return mimeToExt[mimetype] || '';
  }
}
