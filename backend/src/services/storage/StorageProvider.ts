/**
 * Abstract storage provider interface for file uploads
 * Allows swapping between local filesystem (dev) and cloud storage (prod)
 */
export interface StorageProvider {
  /**
   * Upload a file
   * @param file - File buffer
   * @param filename - Desired filename (will be sanitized)
   * @param mimetype - MIME type of the file
   * @returns Public URL to access the file
   */
  upload(file: Buffer, filename: string, mimetype: string): Promise<string>;

  /**
   * Delete a file
   * @param path - Path or URL of the file to delete
   */
  delete(path: string): Promise<void>;

  /**
   * Get public URL for a file
   * @param path - Internal path of the file
   * @returns Public URL
   */
  getUrl(path: string): string;
}
