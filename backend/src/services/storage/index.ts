import { StorageProvider } from './StorageProvider.js';
import { LocalStorage } from './LocalStorage.js';
import { R2Storage } from './R2Storage.js';
import { env } from '../../config/env.js';

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    if (env.storageProvider === 'r2') {
      storageInstance = new R2Storage();
    } else {
      storageInstance = new LocalStorage();
    }
  }
  return storageInstance;
}

export type { StorageProvider } from './StorageProvider.js';
