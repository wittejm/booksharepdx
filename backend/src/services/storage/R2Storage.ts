import { StorageProvider } from './StorageProvider.js';

/**
 * Cloudflare R2 storage provider for production
 * TODO: Implement when deploying to production
 */
export class R2Storage implements StorageProvider {
  constructor() {
    // TODO: Initialize R2 client
    console.warn('R2Storage is not yet implemented. Using stub.');
  }

  async upload(file: Buffer, filename: string, mimetype: string): Promise<string> {
    // TODO: Implement R2 upload
    throw new Error('R2Storage not implemented');
  }

  async delete(path: string): Promise<void> {
    // TODO: Implement R2 delete
    throw new Error('R2Storage not implemented');
  }

  getUrl(path: string): string {
    // TODO: Return R2 public URL
    throw new Error('R2Storage not implemented');
  }
}
